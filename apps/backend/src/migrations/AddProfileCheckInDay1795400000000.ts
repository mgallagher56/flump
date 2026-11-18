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
    // A plain CHECK is fine here. The migration runs in one transaction, so the ACCESS EXCLUSIVE
    // lock from ADD COLUMN is held to commit anyway and a NOT VALID then VALIDATE split would save
    // nothing. The column is new, nullable and null on every row, and user_profiles is small, so
    // the check's scan is quick and the lock is held only briefly.
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}" CHECK ("check_in_day" BETWEEN 1 AND 31)`,
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
