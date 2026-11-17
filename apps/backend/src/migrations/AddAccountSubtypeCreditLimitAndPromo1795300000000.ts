import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * UX Batch D: additive, nullable columns on `accounts` for:
 * - `account_subtype` (savings subtypes, investment subtypes, residential vs BTL mortgage)
 * - `credit_limit` (credit card / overdraft limit, usable even at £0 balance)
 * - `promo_zero_percent_until` (0% interest period end date for credit cards / overdrafts)
 */
export const DOWN_REFUSAL =
  "accounts has saved subtypes, credit limits or 0% dates; export or clear them before reverting";

export class AddAccountSubtypeCreditLimitAndPromo1795300000000 implements MigrationInterface {
  name = "AddAccountSubtypeCreditLimitAndPromo1795300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      'ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "account_subtype" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "credit_limit" numeric(12,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "promo_zero_percent_until" date',
    );
  }

  /**
   * Drops the three columns, but only while none of them holds a value: a subtype, limit or 0%
   * date a user saved is never dropped silently. With values present it refuses and changes
   * nothing, so the data is exported or cleared on purpose first.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const rows: Array<{ n: number }> = await queryRunner.query(
      `SELECT count(*)::int AS n FROM "accounts"
        WHERE "account_subtype" IS NOT NULL
           OR "credit_limit" IS NOT NULL
           OR "promo_zero_percent_until" IS NOT NULL`,
    );
    if (Number(rows[0]?.n ?? 0) > 0) {
      throw new Error(DOWN_REFUSAL);
    }
    await queryRunner.query(
      'ALTER TABLE "accounts" DROP COLUMN IF EXISTS "promo_zero_percent_until"',
    );
    await queryRunner.query('ALTER TABLE "accounts" DROP COLUMN IF EXISTS "credit_limit"');
    await queryRunner.query('ALTER TABLE "accounts" DROP COLUMN IF EXISTS "account_subtype"');
  }
}
