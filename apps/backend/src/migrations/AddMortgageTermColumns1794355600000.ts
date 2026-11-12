import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// DECISIONS round 3, item 14: additive, nullable Mortgage-account columns. No backfill:
// existing rows keep NULL until the owner enters a term / fixed-rate end date.
export class AddMortgageTermColumns1794355600000 implements MigrationInterface {
  name = "AddMortgageTermColumns1794355600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      'ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "term_months" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "fixed_rate_end_date" date',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query('ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fixed_rate_end_date"');
    await queryRunner.query('ALTER TABLE "accounts" DROP COLUMN IF EXISTS "term_months"');
  }
}
