import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// Pre-release review: salary sacrifice must never be assumed, so new profile rows default to false.
// This only changes the column default (a catalog change). Existing rows keep their stored value:
// whether to backfill them is an owner decision and is deliberately not done here.
export class SalarySacrificeDefaultFalse1794357400000 implements MigrationInterface {
  name = "SalarySacrificeDefaultFalse1794357400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "is_salary_sacrifice" SET DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "is_salary_sacrifice" SET DEFAULT true`,
    );
  }
}
