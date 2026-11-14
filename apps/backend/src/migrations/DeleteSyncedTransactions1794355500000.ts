import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E19 D8-A (owner confirmed 2026-11-12): bank sync no longer stores transactions, so remove
// the ones it already stored. `transactions` has no source column; a row came from bank
// sync exactly when its account is linked to a bank connection (`accounts.connection_id`).
// Transactions on manually created accounts (connection_id IS NULL) are never touched.
//
// Destructive and not reversible by `down`: take a pg_dump first. Like ClearBankTokens it
// must run exactly once, so a re-run cannot delete rows added after the first run.
export class DeleteSyncedTransactions1794355500000 implements MigrationInterface {
  name = "DeleteSyncedTransactions1794355500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

    const tableName = queryRunner.connection.options.migrationsTableName ?? "migrations";
    if (await queryRunner.hasTable(tableName)) {
      const escaped = queryRunner.connection.driver.escape(tableName);
      const recorded: unknown[] = await queryRunner.query(
        `SELECT 1 FROM ${escaped} WHERE "name" = $1`,
        [this.name],
      );
      if (recorded.length > 0) return;
    }

    await queryRunner.query(
      `DELETE FROM "transactions" t
       USING "accounts" a
       WHERE t."account_id"::text = a."id"::text
         AND a."connection_id" IS NOT NULL`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op: the deleted rows cannot be recovered. Restore from the
    // pg_dump taken before running this migration if they are ever needed.
  }
}
