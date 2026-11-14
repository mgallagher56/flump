import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// Backend audit H7: the six core tables had only primary keys, so every per-user read was a
// sequential scan over every user's rows. Each index matches a real query shape: the leading
// column is the filter and the next one the ORDER BY, so one index serves both (a b-tree is read
// backwards for DESC, so ascending columns serve "newest first" too).
export const USER_ID_INDEXES = [
  // finance.service getTransactions, agent-data transaction queries: user_id, newest first.
  {
    name: "IDX_transactions_user_timestamp",
    table: "transactions",
    columns: ["user_id", "timestamp"],
  },
  // getTransactions(accountId), account deletes and the import revert NOT EXISTS check.
  { name: "IDX_transactions_account", table: "transactions", columns: ["account_id"] },
  // account-intake getAccounts and agent getAccounts: user_id ORDER BY created_at (every page).
  { name: "IDX_accounts_user_created", table: "accounts", columns: ["user_id", "created_at"] },
  // tax.controller and agent tax reads: user_id ORDER BY date DESC (or ASC for ranged reads).
  { name: "IDX_tax_records_user_date", table: "tax_records", columns: ["user_id", "date"] },
  // budget.controller and agent reads: user_id ORDER BY created_at.
  {
    name: "IDX_budget_entries_user_created",
    table: "budget_entries",
    columns: ["user_id", "created_at"],
  },
  // finance.service getBankConnections: user_id ORDER BY created_at DESC.
  {
    name: "IDX_bank_connections_user_created",
    table: "bank_connections",
    columns: ["user_id", "created_at"],
  },
  // mcp-token.service listTokens: user_id ORDER BY created_at DESC.
  { name: "IDX_mcp_tokens_user_created", table: "mcp_tokens", columns: ["user_id", "created_at"] },
] as const;

/**
 * Builds the indexes with CREATE INDEX CONCURRENTLY, which takes only a SHARE UPDATE EXCLUSIVE
 * lock: reads and writes carry on while each index builds. CONCURRENTLY cannot run inside a
 * transaction, so this migration opts out of one (`transaction = false`; the data source runs
 * migrations in "each" mode) and serialises with other instances on a session advisory lock
 * instead of the transaction-scoped one the other migrations use.
 *
 * A failed concurrent build leaves an INVALID index behind that IF NOT EXISTS would then skip, so
 * any invalid index of the same name is dropped first; a rerun after a crash therefore finishes
 * the job. The session's statement and lock timeouts are lifted for the build (a large table can
 * take longer than the pool's 10 s cap) and restored afterwards.
 *
 * down() runs inside the transaction TypeORM opens for a revert, so it uses a plain DROP INDEX:
 * that takes an ACCESS EXCLUSIVE lock, but only for the moment it takes to drop the index.
 */
export class AddUserIdIndexes1794357420000 implements MigrationInterface {
  name = "AddUserIdIndexes1794357420000";
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await queryRunner.query("SET statement_timeout = 0");
      await queryRunner.query("SET lock_timeout = 0");
      for (const index of USER_ID_INDEXES) {
        const invalid: unknown[] = await queryRunner.query(
          `SELECT 1 FROM pg_index i
           JOIN pg_class c ON c.oid = i.indexrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = current_schema() AND c.relname = $1 AND NOT i.indisvalid`,
          [index.name],
        );
        if (invalid.length > 0) {
          await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`);
        }
        const columns = index.columns.map((c) => `"${c}"`).join(", ");
        await queryRunner.query(
          `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${index.name}" ON "${index.table}" (${columns})`,
        );
      }
    } finally {
      // RESET returns to the connection's startup values (the pool's limits).
      await queryRunner.query("RESET statement_timeout");
      await queryRunner.query("RESET lock_timeout");
      await queryRunner.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    for (const index of [...USER_ID_INDEXES].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index.name}"`);
    }
  }
}
