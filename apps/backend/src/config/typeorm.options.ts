import { join } from "node:path";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Account } from "../entities/account.entity";
import { AccountDeletionTombstone } from "../entities/account-deletion-tombstone.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { AgentAuditEvent } from "../entities/agent-audit-event.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { BankOAuthState } from "../entities/bank-oauth-state.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { IdempotencyKey } from "../entities/idempotency-key.entity";
import { ImportBatch } from "../entities/import-batch.entity";
import { McpToken } from "../entities/mcp-token.entity";
import { SnapshotCheckin } from "../entities/snapshot-checkin.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { type Env, resolveDbConfig } from "./db.config";

// biome-ignore lint/complexity/noBannedTypes: TypeORM entity classes are typed as Function[]
export const ENTITIES: Function[] = [
  Account,
  Transaction,
  AccountDetail,
  BankConnection,
  BankOAuthState,
  UserProfile,
  BudgetEntry,
  TaxRecord,
  McpToken,
  SnapshotCheckin,
  ImportBatch,
  AgentAuditEvent,
  AccountDeletionTombstone,
  IdempotencyKey,
];

// Relative to this file so it resolves under both `bun src/...` (ts) and dist/ (js).
// Migration file names MUST end in their timestamp digits (Name1794355200000.ts) or they are
// silently ignored; `*[0-9]` is what skips specs, .d.ts and source maps in the same folder.
const MIGRATIONS_GLOB = join(__dirname, "..", "migrations", "*[0-9]{.ts,.js}");

/**
 * The single source of TypeORM options (used by the Nest app and the CLI data source).
 *
 * DATABASE_URL is split into discrete fields rather than handed to the driver:
 * a `?sslmode=...` in the URL could otherwise override the resolver's `ssl`
 * decision inside pg. Query parameters on the URL are therefore ignored.
 */
export function typeOrmOptionsFromEnv(env: Env): TypeOrmModuleOptions {
  const db = resolveDbConfig(env);

  let connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  if ("url" in db.connection) {
    const url = new URL(db.connection.url);
    connection = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
  } else {
    connection = db.connection;
  }

  return {
    type: "postgres",
    ...connection,
    ssl: db.ssl,
    entities: ENTITIES,
    migrations: [MIGRATIONS_GLOB],
    synchronize: db.synchronize,
    migrationsRun: db.migrationsRun,
    // Each migration runs in its own transaction, so one that must not (an index built
    // CONCURRENTLY) can opt out with `transaction = false`. Every migration takes the shared
    // advisory lock itself (config/migration-lock.ts), so instances still serialise. Trade-off:
    // if migration N fails, migrations 1..N-1 stay committed (each must be safe on its own).
    migrationsTransactionMode: "each",
    // Handed to the pg Pool. Fail fast instead of queueing forever: a request waits at most
    // connectionTimeoutMillis for a connection, and Postgres cancels a statement, a lock wait
    // or an idle open transaction past its limit. These apply to migrations at boot too; a
    // migration lifts them for itself through the helpers in config/migration-lock.ts.
    extra: {
      max: db.pool.max,
      connectionTimeoutMillis: db.pool.connectionTimeoutMillis,
      idleTimeoutMillis: db.pool.idleTimeoutMillis,
      statement_timeout: db.pool.statementTimeoutMillis,
      lock_timeout: db.pool.lockTimeoutMillis,
      idle_in_transaction_session_timeout: db.pool.idleInTransactionTimeoutMillis,
      // Timestamp columns have no time zone (audit M5), so the session is pinned to UTC
      // to match the UTC Node process (main.ts).
      options: "-c TimeZone=UTC",
    },
  };
}
