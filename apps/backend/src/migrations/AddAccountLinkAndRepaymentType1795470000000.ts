import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 4, migration 1 of 4 (docs/audit/system-2026-11/PLAN.md): a mortgage names the
 * property it is on, and stores how it is repaid.
 *
 * - `accounts.linked_account_id uuid NULL`, a foreign key to `accounts(id)` ON DELETE SET NULL, so
 *   deleting a property leaves its mortgage in place, unlinked. Indexed, so that delete never
 *   scans the table. A row may not point at itself.
 * - `accounts.repayment_type varchar NULL`, `repayment` or `interest-only`. Null is "not set".
 *
 * Additive: both columns are nullable with no default, so adding them rewrites nothing and no
 * figure changes until the back-fill (migration 2) or a user sets them. Idempotent: every step
 * checks first, so a second run, or a run on a synchronize-built database that already has the
 * columns, changes nothing. down() drops both columns with their constraints and index.
 */
export const LINKED_ACCOUNT_FK = "FK_accounts_linked_account";
export const LINKED_ACCOUNT_INDEX = "IDX_accounts_linked_account";
export const LINKED_NOT_SELF_CHECK = "CHK_accounts_linked_not_self";
export const REPAYMENT_TYPE_CHECK = "CHK_accounts_repayment_type";

export class AddAccountLinkAndRepaymentType1795470000000 implements MigrationInterface {
  name = "AddAccountLinkAndRepaymentType1795470000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Fail fast instead of queueing behind a long transaction (and stalling readers behind it).
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "linked_account_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "repayment_type" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${REPAYMENT_TYPE_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "${REPAYMENT_TYPE_CHECK}" CHECK ("repayment_type" IS NULL OR "repayment_type" IN ('repayment', 'interest-only'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${LINKED_NOT_SELF_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "${LINKED_NOT_SELF_CHECK}" CHECK ("linked_account_id" IS NULL OR "linked_account_id" <> "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "${LINKED_ACCOUNT_INDEX}" ON "accounts" ("linked_account_id")`,
    );
    const fk: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = '"accounts"'::regclass`,
      [LINKED_ACCOUNT_FK],
    );
    if (fk.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "accounts" ADD CONSTRAINT "${LINKED_ACCOUNT_FK}" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${LINKED_ACCOUNT_FK}"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "${LINKED_ACCOUNT_INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${LINKED_NOT_SELF_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${REPAYMENT_TYPE_CHECK}"`,
    );
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "linked_account_id"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "repayment_type"`);
  }
}
