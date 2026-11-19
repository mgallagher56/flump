import { UK_EWNI_INCOME_TAX } from "@flump/finance-engine";
import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import { PENSION_DEFAULTS_CLEAR_BEFORE } from "./ClearDefaultPensionRates1795480100000";

/**
 * The old onboarding take-home flow saved a monthly take-home T as both `monthly_take_home = T`
 * and `annual_salary = T x 12`. `annual_salary` is read as a gross salary, so take-home and tax
 * were then worked out from T x 12, a figure the person never gave. Owner-approved: where the
 * pair still matches that write exactly and the salary is above takeHomePairAmbiguousUpTo(),
 * `annual_salary` is set to null ("not set") and the take-home is kept.
 *
 * Guard: the rule holds only while every such pair came from the old flow (all data is tester
 * data today). So the migration changes no profile when it runs on or after
 * TAKE_HOME_SALARY_CLEAR_BEFORE, nor when its before-image table already exists (it has run
 * once: a second run, say from a second instance in a rolling deploy, could clear a salary saved
 * since). The table is created on the first run either way (empty after a skip), so it is also
 * the run-once marker and the retention job and erasure always find it.
 *
 * The before-image `take_home_salary_backfill` keeps each changed row's old values for 90 days
 * (the retention job then removes it) so down() can restore them; its rows go with the profile by
 * ON DELETE CASCADE. Logs counts only, never ids or values.
 */
export const TAKE_HOME_SALARY_BACKFILL_TABLE = "take_home_salary_backfill";

/**
 * The same cutoff as ClearDefaultPensionRates: both rules rest on all stored data being tester
 * data, which holds until the same date.
 */
export const TAKE_HOME_SALARY_CLEAR_BEFORE = PENSION_DEFAULTS_CLEAR_BEFORE;

/**
 * The personal allowance (£12,570), read from the engine's tax tables for the 2026/27 tax year,
 * named explicitly and never "the current year", so the migration gives the same result whenever
 * it runs; the threshold still has one home. At or below it a real gross salary with no deductions
 * gives a take-home of exactly salary / 12, so a pair matching the old write is ambiguous and is
 * left alone. Above it income tax or National Insurance is always due, so take-home x 12 can only
 * equal the salary when the salary was written from the take-home.
 */
export const TAKE_HOME_RULES_TAX_YEAR = "2026/27";

/**
 * Read when the migration runs, never at module load: migrations load at every boot, so a later
 * engine change that drops this year's table must not stop the backend starting. Null when the
 * table is gone; up() then skips and logs.
 */
export function takeHomePairAmbiguousUpTo(): number | null {
  return UK_EWNI_INCOME_TAX[TAKE_HOME_RULES_TAX_YEAR]?.personalAllowance ?? null;
}

export class ClearTakeHomeSalaries1795530100000 implements MigrationInterface {
  name = "ClearTakeHomeSalaries1795530100000";

  /**
   * The clock the cutoff is checked against. Unset (TypeORM's case) means the database's now();
   * a test sets it to check each side of the cutoff without mocking time.
   */
  now: Date | undefined = undefined;

  private readonly logger = new Logger("ClearTakeHomeSalaries");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    // The image table doubles as the run-once marker: it exists only if up() has run before.
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${TAKE_HOME_SALARY_BACKFILL_TABLE}`,
    ]);
    if (ran === true) {
      this.logger.log("skipped: already ran once");
      return;
    }

    // Blocks writes (never reads) until commit, so no salary can be saved between image and clear.
    await queryRunner.query(`LOCK TABLE "user_profiles" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `CREATE TABLE "${TAKE_HOME_SALARY_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
         "old_annual_salary" numeric(12,2),
         "old_monthly_take_home" numeric(12,2),
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${TAKE_HOME_SALARY_BACKFILL_TABLE}_profile" ON "${TAKE_HOME_SALARY_BACKFILL_TABLE}" ("profile_id")`,
    );

    const [{ before }] = await queryRunner.query(
      "SELECT COALESCE($2::timestamptz, now()) < $1::timestamptz AS before",
      [TAKE_HOME_SALARY_CLEAR_BEFORE, this.now?.toISOString() ?? null],
    );
    if (before !== true) {
      this.logger.log("skipped: past the cutoff, stored salaries are answers");
      return;
    }
    const ambiguousUpTo = takeHomePairAmbiguousUpTo();
    if (ambiguousUpTo === null) {
      this.logger.log("skipped: no personal allowance for the named tax year");
      return;
    }
    await queryRunner.query(
      `INSERT INTO "${TAKE_HOME_SALARY_BACKFILL_TABLE}"
         ("profile_id", "old_annual_salary", "old_monthly_take_home")
       SELECT "id", "annual_salary", "monthly_take_home"
       FROM "user_profiles"
       WHERE "monthly_take_home" > 0 AND "annual_salary" = "monthly_take_home" * 12
         AND "annual_salary" > $1`,
      [ambiguousUpTo],
    );
    const [{ cleared }] = await queryRunner.query(
      `WITH changed AS (
         UPDATE "user_profiles" p SET "annual_salary" = NULL
         FROM "${TAKE_HOME_SALARY_BACKFILL_TABLE}" b WHERE b."profile_id" = p."id"
         RETURNING 1
       )
       SELECT count(*)::int AS cleared FROM changed`,
    );
    this.logger.log(`cleared a salary written from take-home on ${cleared} profiles`);
  }

  /**
   * Restores the salary only where it is still null and the take-home is still the imaged one: a
   * salary or take-home saved since is the person's and is kept. Then drops the image. Nothing to
   * do when up() skipped.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${TAKE_HOME_SALARY_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `UPDATE "user_profiles" p SET "annual_salary" = b."old_annual_salary"
       FROM "${TAKE_HOME_SALARY_BACKFILL_TABLE}" b
       WHERE b."profile_id" = p."id" AND p."annual_salary" IS NULL
         AND p."monthly_take_home" = b."old_monthly_take_home"`,
    );
    await queryRunner.query(`DROP TABLE "${TAKE_HOME_SALARY_BACKFILL_TABLE}"`);
  }
}
