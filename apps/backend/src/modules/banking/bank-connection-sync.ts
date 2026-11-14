import { BankSyncOrchestrator } from "@flump/banking/server";
import { Logger } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
import { safeErrorSummary } from "../../common/log-safe";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { writeConnectedSnapshot } from "../snapshots/connected-write";
import { londonDate } from "../snapshots/london-date";
import { resignHistoryForType, storedBalance } from "../snapshots/stored-balance";
import type { BankProvider, ProviderAccount } from "./providers/provider.interface";

// BE-12 (audit H3, H4, H2 sync side, M11 lazy re-encryption). The bank sync in three steps, each
// with its own guarantee:
//   1. `claim`: one sync per connection at a time, through a lease column (a second one gets 409).
//      A crashed sync's lease lapses after SYNC_LEASE_MS.
//   2. `activeAccessToken`: refresh (grant_type=refresh_token) under a row lock, so two code paths
//      can never spend the same rotating refresh token; old ciphertext is re-encrypted to the
//      active key version with the connection id as associated data.
//   3. `writeAccounts`: one transaction; accounts are upserted on the partial unique index
//      (user_id, connection_id, external_account_id), so a retry or double click cannot insert a
//      duplicate. An account the provider reported unusably is skipped (savepoint), never
//      written as 0, and the sync is reported as partial.

/** Overall deadline for the provider calls of one sync. */
export const SYNC_DEADLINE_MS = 25_000;
/** How long a sync lease is honoured; longer than any sync can run. */
export const SYNC_LEASE_MS = 120_000;
const TOKEN_REFRESH_MARGIN_MS = 300_000;

/** The stored tokens cannot be used (missing, undecryptable, or no way to refresh them). */
export class ConnectionNeedsReconnectError extends Error {
  constructor(reason: string) {
    super(`bank connection needs reconnecting: ${reason}`);
    this.name = "ConnectionNeedsReconnectError";
  }
}

export interface SyncOutcome {
  total: number;
  updated: number;
  skipped: number;
}

export interface OAuthClientCredentials {
  clientId?: string;
  clientSecret?: string;
}

/** Rows from a DML RETURNING through query(): pg yields [rows, count] for UPDATE and DELETE. */
function returnedRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return (Array.isArray(result) ? result : []) as T[];
}

function isUsableProviderAccount(pa: ProviderAccount): boolean {
  return (
    typeof pa.externalAccountId === "string" &&
    pa.externalAccountId.length > 0 &&
    typeof pa.name === "string" &&
    typeof pa.type === "string" &&
    pa.type.length > 0 &&
    typeof pa.balance === "number" &&
    Number.isFinite(pa.balance) &&
    typeof pa.currency === "string" &&
    pa.currency.length > 0
  );
}

/** Associated data binding a ciphertext to its connection and column (M11): no swapping. */
export const accessTokenAad = (connectionId: string): string => `${connectionId}:access`;
export const refreshTokenAad = (connectionId: string): string => `${connectionId}:refresh`;

/** The connection was deleted while the sync ran; nothing is written. */
export class ConnectionGoneError extends Error {
  constructor() {
    super("bank connection was removed during the sync");
    this.name = "ConnectionGoneError";
  }
}

export class BankConnectionSync {
  private readonly logger = new Logger("BankConnectionSync");

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Takes the sync lease. Returns the lease token (the claimed timestamp), or null when another
   * sync for this connection holds it.
   */
  async claim(connectionId: string, userId: string): Promise<string | null> {
    const result = await this.dataSource.query(
      `UPDATE "bank_connections" SET "sync_started_at" = now()
       WHERE "id" = $1 AND "user_id" = $2
         AND ("sync_started_at" IS NULL
              OR "sync_started_at" < now() - make_interval(secs => $3::double precision))
       RETURNING "sync_started_at"::text AS "lease"`,
      [connectionId, userId, SYNC_LEASE_MS / 1000],
    );
    return returnedRows<{ lease: string }>(result)[0]?.lease ?? null;
  }

  /** Releases only this sync's lease: a slow sync never clears a newer sync's lease. */
  async release(connectionId: string, lease: string): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE "bank_connections" SET "sync_started_at" = NULL
         WHERE "id" = $1 AND "sync_started_at" = $2::timestamptz`,
        [connectionId, lease],
      );
    } catch (err) {
      // The lease lapses on its own; a failed release only delays the next sync.
      this.logger.warn(`Sync lease release failed: ${safeErrorSummary(err)}`);
    }
  }

  /**
   * A usable plaintext access token. Refreshes it when it is about to expire, holding the
   * connection row lock from reading the refresh token until the new tokens are saved.
   * Throws ConnectionNeedsReconnectError or a BankProviderError (AUTH_EXPIRED when the provider
   * rejects the refresh token).
   */
  async activeAccessToken(
    connectionId: string,
    provider: BankProvider,
    credentials: OAuthClientCredentials,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BankConnection);
      const conn = await repo.findOne({
        where: { id: connectionId },
        lock: { mode: "pessimistic_write" },
      });
      if (!conn?.accessToken) throw new ConnectionNeedsReconnectError("no stored access token");

      let access: string;
      let refresh: string | null = null;
      try {
        access = BankSyncOrchestrator.decryptToken(conn.accessToken, accessTokenAad(conn.id));
        if (conn.refreshToken)
          refresh = BankSyncOrchestrator.decryptToken(conn.refreshToken, refreshTokenAad(conn.id));
      } catch (err) {
        this.logger.error(`Stored bank tokens unusable: ${safeErrorSummary(err)}`);
        throw new ConnectionNeedsReconnectError("stored tokens cannot be decrypted");
      }

      const expiring = BankSyncOrchestrator.isTokenExpiring(
        conn.expiresAt,
        TOKEN_REFRESH_MARGIN_MS,
      );
      if (expiring) {
        if (!refresh)
          throw new ConnectionNeedsReconnectError("access token expired, no refresh token");
        if (!credentials.clientId || !credentials.clientSecret) {
          throw new ConnectionNeedsReconnectError("OAuth client credentials are not configured");
        }
        const tokens = await provider.refreshToken(
          credentials.clientId,
          credentials.clientSecret,
          refresh,
        );
        access = tokens.accessToken;
        if (tokens.refreshToken) refresh = tokens.refreshToken;
        await repo.update(conn.id, {
          accessToken: BankSyncOrchestrator.encryptToken(access, accessTokenAad(conn.id)),
          refreshToken: refresh
            ? BankSyncOrchestrator.encryptToken(refresh, refreshTokenAad(conn.id))
            : null,
          expiresAt: BankSyncOrchestrator.calculateExpiryDate(tokens.expiresIn) ?? null,
        });
        return access;
      }

      // Lazy re-encryption (M11): old ciphertext moves to the active key and gains the AAD.
      const stale =
        BankSyncOrchestrator.tokenNeedsReencrypt(conn.accessToken) ||
        (conn.refreshToken !== null && BankSyncOrchestrator.tokenNeedsReencrypt(conn.refreshToken));
      if (stale) {
        await repo.update(conn.id, {
          accessToken: BankSyncOrchestrator.encryptToken(access, accessTokenAad(conn.id)),
          refreshToken: refresh
            ? BankSyncOrchestrator.encryptToken(refresh, refreshTokenAad(conn.id))
            : null,
        });
      }
      return access;
    });
  }

  /** Writes the provider's accounts and this month's snapshots in one transaction. */
  async writeAccounts(
    connectionId: string,
    userId: string,
    providerAccounts: ProviderAccount[],
  ): Promise<SyncOutcome> {
    // One clock reading for year, month and date (E30 D3).
    const today = londonDate();
    const [year, month] = today.split("-").map(Number) as [number, number];
    const outcome: SyncOutcome = { total: providerAccounts.length, updated: 0, skipped: 0 };

    await this.dataSource.transaction(async (manager) => {
      // Holds off a concurrent disconnect until this commits, and stops here if it already ran:
      // a sync never writes accounts back for a connection the user removed.
      const live = await manager.query(
        `SELECT 1 FROM "bank_connections" WHERE "id" = $1 AND "user_id" = $2 FOR SHARE`,
        [connectionId, userId],
      );
      if (returnedRows(live).length === 0) throw new ConnectionGoneError();
      for (const [index, pa] of providerAccounts.entries()) {
        if (!isUsableProviderAccount(pa)) {
          outcome.skipped += 1;
          this.logger.warn(`Bank sync skipped account #${index + 1}: unusable provider data`);
          continue;
        }
        await manager.query("SAVEPOINT bank_sync_account");
        try {
          await this.upsertAccount(manager, { connectionId, userId, pa, year, month, today });
          await manager.query("RELEASE SAVEPOINT bank_sync_account");
          outcome.updated += 1;
        } catch (err) {
          await manager.query("ROLLBACK TO SAVEPOINT bank_sync_account");
          outcome.skipped += 1;
          this.logger.warn(`Bank sync skipped account #${index + 1}: ${safeErrorSummary(err)}`);
        }
      }
    });
    return outcome;
  }

  private async upsertAccount(
    manager: EntityManager,
    w: {
      connectionId: string;
      userId: string;
      pa: ProviderAccount;
      year: number;
      month: number;
      today: string;
    },
  ): Promise<void> {
    const { connectionId, userId, pa } = w;
    const value = storedBalance(pa.type, pa.balance);
    const details = manager.getRepository(AccountDetail);

    const inserted = returnedRows<{ id: string }>(
      await manager.query(
        `INSERT INTO "accounts"
           ("user_id", "name", "type", "balance", "currency", "connection_id", "external_account_id")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("user_id", "connection_id", "external_account_id")
           WHERE "connection_id" IS NOT NULL AND "external_account_id" IS NOT NULL
           DO NOTHING
         RETURNING "id"`,
        [userId, pa.name, pa.type, value, pa.currency, connectionId, pa.externalAccountId],
      ),
    );

    let accountId = inserted[0]?.id;
    if (!accountId) {
      const [existing] = returnedRows<{ id: string; type: string; balance: string }>(
        await manager.query(
          `SELECT "id", "type", "balance" FROM "accounts"
           WHERE "user_id" = $1 AND "connection_id" = $2 AND "external_account_id" = $3
           FOR UPDATE`,
          [userId, connectionId, pa.externalAccountId],
        ),
      );
      if (!existing) throw new Error("account vanished between insert and select");
      accountId = existing.id;
      if (existing.type !== pa.type) {
        // A reclassified account follows the new type's sign rule (BE-05): history first, while
        // the row is still the old type, so the database check holds after every statement.
        await resignHistoryForType(details, accountId, pa.type);
        await manager.query(
          `UPDATE "accounts" SET "name" = $1, "type" = $2, "balance" = $3 WHERE "id" = $4`,
          [pa.name, pa.type, storedBalance(pa.type, Number(existing.balance)), accountId],
        );
      } else {
        // The balance moves only through writeConnectedSnapshot, which respects a manual value.
        await manager.query(`UPDATE "accounts" SET "name" = $1 WHERE "id" = $2`, [
          pa.name,
          accountId,
        ]);
      }
    }

    await writeConnectedSnapshot(details, manager.getRepository(Account), {
      accountId,
      userId,
      year: w.year,
      month: w.month,
      value,
      asOfDate: w.today,
    });
    // E19 D8-A: synced transactions are deliberately not stored.
  }

  /** Deletes a connection and everything synced from it, in one transaction. */
  /**
   * `alsoInTransaction` runs last in the same transaction (BE-06: the disconnect's audit row and
   * consent withdrawal), so the deletion and its record commit or roll back together.
   */
  async deleteConnectionData(
    connectionId: string,
    userId: string,
    alsoInTransaction?: (manager: EntityManager) => Promise<unknown>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Waits for a running sync's account writes to commit, so they are deleted too.
      await manager.query(
        `SELECT 1 FROM "bank_connections" WHERE "id" = $1 AND "user_id" = $2 FOR UPDATE`,
        [connectionId, userId],
      );
      // Compared as text so this keeps working when account_id becomes uuid (BE-08).
      const owned = `SELECT "id"::text FROM "accounts" WHERE "connection_id" = $1 AND "user_id" = $2`;
      await manager.query(`DELETE FROM "account_details" WHERE "account_id"::text IN (${owned})`, [
        connectionId,
        userId,
      ]);
      await manager.query(`DELETE FROM "transactions" WHERE "account_id"::text IN (${owned})`, [
        connectionId,
        userId,
      ]);
      await manager.query(`DELETE FROM "accounts" WHERE "connection_id" = $1 AND "user_id" = $2`, [
        connectionId,
        userId,
      ]);
      await manager.query(`DELETE FROM "bank_connections" WHERE "id" = $1 AND "user_id" = $2`, [
        connectionId,
        userId,
      ]);
      await alsoInTransaction?.(manager);
    });
  }
}
