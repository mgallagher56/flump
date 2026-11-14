import type { DeleteUserResponse } from "@flump/api-contract";
import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource, LessThan } from "typeorm";
import { AccountDeletionTombstone } from "../entities/account-deletion-tombstone.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { USER_IDENTITY_ADAPTER, type UserIdentityAdapter } from "../identity/identity.adapter";
import { safeErrorSummary } from "../log-safe";
import { BANK_CONSENT_REVOKER, type BankConsentRevoker } from "./bank-consent-revoker";
import {
  resolveTombstoneKey,
  TOMBSTONE_KEY_ENV_VAR,
  tombstoneExpiry,
  tombstoneSubjectHash,
} from "./tombstone-key";
import { type RemovedCounts, USER_DATA_REGISTRY } from "./user-data-registry";

export const ACCOUNT_DELETION_UNAVAILABLE =
  "Account deletion is not available right now. Please try again later.";

/**
 * Erases an account (BE-04, finding C1): every row carrying the user id, in one transaction, then
 * the WorkOS login. Safe to repeat: a retry deletes nothing new, finds the tombstone by its key
 * hash and retries only the WorkOS step.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);
  private readonly key: string | null;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(USER_IDENTITY_ADAPTER) private readonly identity: UserIdentityAdapter,
    @Inject(BANK_CONSENT_REVOKER) private readonly bankConsentRevoker: BankConsentRevoker,
  ) {
    this.key = resolveTombstoneKey(process.env);
    if (!this.key) {
      // The name of the variable only, never a value.
      this.logger.warn(
        `${TOMBSTONE_KEY_ENV_VAR} is not set (or shorter than 32 characters): account deletion returns 503 until it is.`,
      );
    }
  }

  /** True when a tombstone exists for this user (the account was erased). */
  async isErased(userId: string): Promise<boolean> {
    if (!this.key) return false;
    const found = await this.dataSource.getRepository(AccountDeletionTombstone).exists({
      where: { subjectHash: tombstoneSubjectHash(this.key, userId) },
    });
    return found;
  }

  async deleteAccount(userId: string): Promise<DeleteUserResponse> {
    const key = this.key;
    if (!key || !userId) throw new ServiceUnavailableException(ACCOUNT_DELETION_UNAVAILABLE);
    const subjectHash = tombstoneSubjectHash(key, userId);

    // (a) Bank consent, before Flump's copy of the connections goes. Never blocks the erasure.
    await this.revokeBankConsent(userId);

    // (b) One transaction: every registry table, children first, then the tombstone.
    const { tombstone, removed } = await this.dataSource.transaction(async (manager) => {
      const removed: RemovedCounts = {};
      for (const t of USER_DATA_REGISTRY) {
        const result = await manager.getRepository(t.entity).delete({ userId });
        removed[t.key] = result.affected ?? 0;
      }
      const now = new Date();
      const tombstones = manager.getRepository(AccountDeletionTombstone);
      // A retry keeps the first deletion time: ON CONFLICT DO NOTHING, then read the row back.
      await tombstones
        .createQueryBuilder()
        .insert()
        .values({
          subjectHash,
          deletedAt: now,
          identityDeletedAt: null,
          expiresAt: tombstoneExpiry(now),
        })
        .orIgnore()
        .execute();
      // Opportunistic retention: tombstones past their 24 months go on the next write.
      await tombstones.delete({ expiresAt: LessThan(now) });
      const tombstone = await tombstones.findOneByOrFail({ subjectHash });
      return { tombstone, removed };
    });

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
