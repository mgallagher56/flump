import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// Net worth choices (owner ruling: two choices). Two additive columns on user_profiles. The
// defaults are today's behaviour (property counts, student loans do not, decision D-5-B), so no
// existing user's net worth changes. IF NOT EXISTS keeps up idempotent; down drops both.
export class AddNetWorthChoices1794800000000 implements MigrationInterface {
  name = "AddNetWorthChoices1794800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "net_worth_counts_property" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "net_worth_counts_student_loan" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "net_worth_counts_student_loan"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "net_worth_counts_property"`,
    );
  }
}
