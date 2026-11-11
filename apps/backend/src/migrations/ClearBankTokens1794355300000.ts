import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// Stored bank tokens were encrypted under the old (insecure) key handling, so drop
// them all and force every user to reconnect. Must run exactly once: a second run
// would wipe tokens of users who already reconnected.
export class ClearBankTokens1794355300000 implements MigrationInterface {
  name = "ClearBankTokens1794355300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Same lock as the baseline: wait for any concurrent instance to commit, then
    // re-check whether it already recorded this migration (TypeORM's pending list was
    // computed before the transaction began).
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

    // Tokens go on every row; deliberately disconnected connections stay disconnected,
    // everything else must be reconnected (status 'error').
    await queryRunner.query(
      `UPDATE "bank_connections" SET "access_token" = NULL, "refresh_token" = NULL,
         "status" = CASE WHEN "status" = 'disconnected' THEN 'disconnected' ELSE 'error' END,
         "updated_at" = now()`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op: the cleared tokens cannot be recovered.
  }
}
