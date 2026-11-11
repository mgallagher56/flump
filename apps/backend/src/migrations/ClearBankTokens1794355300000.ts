import type { MigrationInterface, QueryRunner } from "typeorm";

// Stored bank tokens were encrypted under the old (insecure) key handling, so drop
// them all and force every user to reconnect. Idempotent: re-running changes nothing new.
export class ClearBankTokens1794355300000 implements MigrationInterface {
  name = "ClearBankTokens1794355300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "bank_connections" SET "access_token" = NULL, "refresh_token" = NULL, "status" = 'error'`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op: the cleared tokens cannot be recovered.
  }
}
