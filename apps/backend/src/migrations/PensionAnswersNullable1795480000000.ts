import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Slice 6, owner decision 3: a workplace pension answer is stored only when the person gives it.
 * Until now `pension_percent`, `pension_employer_percent` and `is_salary_sacrifice` were NOT NULL
 * with row defaults (5, 3 and false), so a profile showed rates nobody chose. This drops the
 * defaults and the NOT NULL, so a new profile holds null ("not set"). Clearing the old defaults
 * from existing rows is ClearDefaultPensionRates1795480100000.
 *
 * Idempotent: dropping a default or NOT NULL that is already gone changes nothing.
 */
export const PENSION_ANSWER_DEFAULTS = {
  pension_percent: "5",
  pension_employer_percent: "3",
  is_salary_sacrifice: "false",
} as const;

export class PensionAnswersNullable1795480000000 implements MigrationInterface {
  name = "PensionAnswersNullable1795480000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    for (const column of Object.keys(PENSION_ANSWER_DEFAULTS)) {
      await queryRunner.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "${column}" DROP DEFAULT, ALTER COLUMN "${column}" DROP NOT NULL`,
      );
    }
  }

  /** Fills unanswered rows with the old defaults, then restores the defaults and NOT NULL. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    for (const [column, value] of Object.entries(PENSION_ANSWER_DEFAULTS)) {
      await queryRunner.query(
        `UPDATE "user_profiles" SET "${column}" = ${value} WHERE "${column}" IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "${column}" SET DEFAULT ${value}, ALTER COLUMN "${column}" SET NOT NULL`,
      );
    }
  }
}
