import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * UX Batch E: the day of the month the monthly check-in falls on. Nullable with no default, so
 * adding it is metadata-only and existing rows read as "not chosen" (the 1st). Days 29 to 31 fall
 * on the last day in shorter months; that is worked out when read, never stored.
 */
export const CHECK_IN_DAY_CONSTRAINT = "CHK_user_profiles_check_in_day";

export class AddProfileCheckInDay1795400000000 implements MigrationInterface {
  name = "AddProfileCheckInDay1795400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      'ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "check_in_day" smallint',
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${CHECK_IN_DAY_CONSTRAINT}"`,
    );
    // NOT VALID takes only a brief lock and skips the scan; VALIDATE then checks existing rows
    // under a lock that still lets reads and writes through.
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}" CHECK ("check_in_day" BETWEEN 1 AND 31) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" VALIDATE CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}"`,
    );
  }

  /** Drops the constraint and the column. A chosen day is a preference, not financial data. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${CHECK_IN_DAY_CONSTRAINT}"`,
    );
    await queryRunner.query('ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "check_in_day"');
  }
}
