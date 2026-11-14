import type { AccountExportKey, DeleteUserResponse } from "@flump/api-contract";
import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource, type EntityManager, In, LessThan } from "typeorm";
import { recordAuditEvent } from "../audit/audit-events";
import type { ErasedAccountCheck } from "../auth/erased-account";
import { Account } from "../entities/account.entity";
import { AccountDeletionTombstone } from "../entities/account-deletion-tombstone.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { Transaction } from "../entities/transaction.entity";
import { USER_IDENTITY_ADAPTER, type UserIdentityAdapter } from "../identity/identity.adapter";
import { safeErrorSummary } from "../log-safe";
import { BANK_CONSENT_REVOKER, type BankConsentRevoker } from "./bank-consent-revoker";
import { resolveTombstoneKey, tombstoneExpiry, tombstoneSubjectHash } from "./tombstone-key";
import { type RemovedCounts, USER_DATA_REGISTRY } from "./user-data-registry";

/** Bound on the in-process cache of erased user ids (cleared whole when full). */
const ERASED_CACHE_MAX = 10_000;

export const ACCOUNT_DELETION_UNAVAILABLE =
  "Account deletion is not available right now. Try again later.";

/**
 * Erases an account (BE-04, finding C1): every row carrying the user id, in one transaction, then
 * the WorkOS login. Safe to repeat: a retry deletes nothing new, finds the tombstone by its key
 * hash and retries only the WorkOS step.
 */
@Injectable()
export class AccountDeletionService implements ErasedAccountCheck {
  private readonly logger = new Logger(AccountDeletionService.name);
  private readonly key: string | null;
  private readonly erasedCache = new Set<string>();

  constructor(
    private readonly dataSource: DataSource,
    @Inject(USER_IDENTITY_ADAPTER) private readonly identity: UserIdentityAdapter,
    @Inject(BANK_CONSENT_REVOKER) private readonly bankConsentRevoker: BankConsentRevoker,
  ) {
    const { key, warning } = resolveTombstoneKey(process.env);
    this.key = key;
    // The name of the variable only, never a value.
    if (warning) this.logger.warn(warning);
  }

  /**
   * True when a tombstone exists for this user (the account was erased). Runs on every
   * authenticated request (AuthGuard), so positive answers are cached in process: a tombstone is
   * never removed while it could matter (24 months). Negative answers are never cached, so a
   * deletion takes effect on the very next request.
   */
  async isErased(userId: string): Promise<boolean> {
    if (!this.key || !userId) return false;
    if (this.erasedCache.has(userId)) return true;
    const found = await this.dataSource.getRepository(AccountDeletionTombstone).exists({
      where: { subjectHash: tombstoneSubjectHash(this.key, userId) },
    });
    if (found) {
      if (this.erasedCache.size >= ERASED_CACHE_MAX) this.erasedCache.clear();
      this.erasedCache.add(userId);
    }
    return found;
  }

  /** Test seam: a test that truncates the tombstone table must forget the cached positives too. */
  clearErasedCache(): void {
    this.erasedCache.clear();
  }

  /**
   * Deletes every row of the user's from every registry table, children first. Before the
   * accounts go, history and transactions keyed to the user's account ids are removed whatever
   * their user_id (the same belt and braces the reset uses). Idempotent.
   */
  private async sweep(manager: EntityManager, userId: string): Promise<RemovedCounts> {
    const removed: RemovedCounts = {};
    const add = (key: AccountExportKey, n: number | null | undefined) => {
      removed[key] = (removed[key] ?? 0) + (n ?? 0);
    };
    const accountIds = (
      await manager.getRepository(Account).find({ where: { userId }, select: { id: true } })
    ).map((a) => a.id);
    if (accountIds.length > 0) {
      add(
        "transactions",
        (await manager.getRepository(Transaction).delete({ accountId: In(accountIds) })).affected,
      );
      add(
        "accountDetails",
        (await manager.getRepository(AccountDetail).delete({ accountId: In(accountIds) })).affected,
      );
    }
    for (const t of USER_DATA_REGISTRY) {
      add(t.key, (await manager.getRepository(t.entity).delete({ userId })).affected);
    }
    return removed;
  }

  async deleteAccount(userId: string): Promise<DeleteUserResponse> {
    const key = this.key;
    if (!key || !userId) throw new ServiceUnavailableException(ACCOUNT_DELETION_UNAVAILABLE);
    const subjectHash = tombstoneSubjectHash(key, userId);

    // (a) Bank consent, before Flump's copy of the connections goes. Never blocks the erasure.
    await this.revokeBankConsent(userId);

    // (b) One transaction: every registry table, children first, then the tombstone.
    const { tombstone, removed } = await this.dataSource.transaction(async (manager) => {
      const removed = await this.sweep(manager, userId);
      const now = new Date();
      const tombstones = manager.getRepository(AccountDeletionTombstone);
      // A retry keeps the first deletion time: ON CONFLICT DO NOTHING, then read the row back.
      const inserted = await tombstones
        .createQueryBuilder()
        .insert()
        .values({
          subjectHash,
          deletedAt: now,
          identityDeletedAt: null,
          expiresAt: tombstoneExpiry(now),
        })
        .orIgnore()
        .returning(["id"])
        .execute();
      // Opportunistic retention: tombstones past their 24 months go on the next write.
      await tombstones.delete({ expiresAt: LessThan(now) });
      const tombstone = await tombstones.findOneByOrFail({ subjectHash });
      // BE-06 (H12): one audit row per erasure, written with the tombstone it describes. No user
      // id (the account is gone): the tombstone id links the two. A retry finds the first
      // tombstone (the insert was ignored and returned no row) and records nothing new.
      if (Array.isArray(inserted.raw) && inserted.raw.length > 0) {
        await recordAuditEvent(manager, {
          userId: null,
          action: "user.deleted",
          targetId: tombstone.id,
          metadata: { removed },
        });
      }
      return { tombstone, removed };
    });

    // (b2) Sweep again now the tombstone is committed. A request that passed the AuthGuard before
    // the commit could still insert rows while the transaction ran; from here on the guard refuses
    // the user, so this second pass (also run on every retry) removes any such stragglers.
    const stragglers = await this.dataSource.transaction((manager) => this.sweep(manager, userId));
    for (const [k, n] of Object.entries(stragglers) as [AccountExportKey, number][]) {
      removed[k] = (removed[k] ?? 0) + n;
    }
    this.erasedCache.add(userId);

    // Audit (after commit): the tombstone id and row counts only. No user id: the account is gone,
    // and the scrubber passes this exact shape through (isAuditEventEntry).
    try {
      this.logger.log({ event: "account_deleted", tombstoneId: tombstone.id, removed });
    } catch {
      // logging failure is ignored
    }

    if (tombstone.identityDeletedAt) return { status: "deleted" };

    // (c) The WorkOS login. A failure leaves the tombstone pending; the same request retried later
    // finishes the job, so this answers 200 identity_pending rather than an error.
    try {
      await this.identity.deleteUser(userId);
    } catch (err) {
      this.logger.warn(`account_deleted identity removal pending: ${safeErrorSummary(err)}`);
      return { status: "identity_pending" };
    }

    // (d) Record that the login is gone.
    await this.dataSource
      .getRepository(AccountDeletionTombstone)
      .update({ id: tombstone.id }, { identityDeletedAt: new Date() });
    return { status: "deleted" };
  }

  private async revokeBankConsent(userId: string): Promise<void> {
    try {
      const connections = await this.dataSource.getRepository(BankConnection).find({
        where: { userId },
        select: { id: true, institutionId: true, authType: true },
      });
      await this.bankConsentRevoker.revokeAll(userId, connections);
    } catch (err) {
      this.logger.warn(`Bank consent revoke warning: ${safeErrorSummary(err)}`);
    }
  }
}
