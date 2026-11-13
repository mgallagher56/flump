import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E20-N16: PATs now always expire (default 90 days) and always anonymise institution names.
// Bring pre-existing rows in line: tokens that never expire get created_at + 90 days (so
// older ones expire immediately on deploy), and un-anonymised tokens become anonymised.
// Not reversible: the old values are not kept, so down() is a no-op.
export class ExpireLegacyMcpTokens1794355700000 implements MigrationInterface {
  name = "ExpireLegacyMcpTokens1794355700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `UPDATE "mcp_tokens" SET "expires_at" = "created_at" + INTERVAL '90 days' WHERE "expires_at" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "mcp_tokens" SET "anonymize_institutions" = true WHERE "anonymize_institutions" = false`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally empty: the previous values cannot be restored.
  }
}
