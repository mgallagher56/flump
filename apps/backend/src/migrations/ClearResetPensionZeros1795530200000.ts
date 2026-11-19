import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import { PENSION_DEFAULTS_CLEAR_BEFORE } from "./ClearDefaultPensionRates1795480100000";

/**
 * The old financial data reset (clearFinancialProfileFields) wrote pension_percent 0,
 * pension_employer_percent 0 and is_salary_sacrifice false, and set has_reset_financial_data,
 * which nothing clears. Those zeros are not answers, so owner-approved: a profile flagged as reset
 * that still holds exactly 0, 0 and false has all three set back to null ("not set"), as a reset
 * does today. A person who really chose 0% and 0% after a reset is asked again.
 *
 * Guard: the same as ClearDefaultPensionRates, and the same cutoff (PENSION_DEFAULTS_CLEAR_BEFORE,
 * imported, as both rules rest on all stored data being tester data). The migration changes no
 * profile when it runs on or after that date, nor when its before-image table already exists (it
 * has run once: a second run could clear answers saved since). The table is created on the first
 * run either way (empty after a skip), so it is also the run-once marker and the retention job
 * and erasure always find it.
 *
 * The before-image `reset_pension_zeros_backfill` keeps each changed row's old values for 90 days
 * (the retention job then removes it) so down() can restore them; its rows go with the profile by
 * ON DELETE CASCADE. Logs counts only, never ids or values.
 */
export const RESET_PENSION_ZEROS_BACKFILL_TABLE = "reset_pension_zeros_backfill";

export class ClearResetPensionZeros1795530200000 implements MigrationInterface {
  name = "ClearResetPensionZeros1795530200000";

  /**
   * The clock the cutoff is checked against. Unset (TypeORM's case) means the database's now();
   * a test sets it to check each side of the cutoff without mocking time.
   */
  now: Date | undefined = undefined;

  private readonly logger = new Logger("ClearResetPensionZeros");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    // The image table doubles as the run-once marker: it exists only if up() has run before.
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${RESET_PENSION_ZEROS_BACKFILL_TABLE}`,
    ]);
    if (ran === true) {
      this.logger.log("skipped: already ran once");
      return;
    }

    // Blocks writes (never reads) until commit, so no answer can be saved between image and clear.
    await queryRunner.query(`LOCK TABLE "user_profiles" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `CREATE TABLE "${RESET_PENSION_ZEROS_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
         "old_pension_percent" numeric(7,4),
         "old_pension_employer_percent" numeric(7,4),
         "old_is_salary_sacrifice" boolean,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${RESET_PENSION_ZEROS_BACKFILL_TABLE}_profile" ON "${RESET_PENSION_ZEROS_BACKFILL_TABLE}" ("profile_id")`,
    );

    const [{ before }] = await queryRunner.query(
      "SELECT COALESCE($2::timestamptz, now()) < $1::timestamptz AS before",
      [PENSION_DEFAULTS_CLEAR_BEFORE, this.now?.toISOString() ?? null],
    );
    if (before !== true) {
      this.logger.log("skipped: past the cutoff, stored pension rates are answers");
      return;
    }
    await queryRunner.query(
      `INSERT INTO "${RESET_PENSION_ZEROS_BACKFILL_TABLE}"
         ("profile_id", "old_pension_percent", "old_pension_employer_percent", "old_is_salary_sacrifice")
       SELECT "id", "pension_percent", "pension_employer_percent", "is_salary_sacrifice"
       FROM "user_profiles"
       WHERE "has_reset_financial_data" = true AND "pension_percent" = 0
         AND "pension_employer_percent" = 0 AND "is_salary_sacrifice" = false`,
    );
    const [{ cleared }] = await queryRunner.query(
      `WITH changed AS (
         UPDATE "user_profiles" p
         SET "pension_percent" = NULL, "pension_employer_percent" = NULL, "is_salary_sacrifice" = NULL
         FROM "${RESET_PENSION_ZEROS_BACKFILL_TABLE}" b WHERE b."profile_id" = p."id"
         RETURNING 1
       )
       SELECT count(*)::int AS cleared FROM changed`,
    );
    this.logger.log(`cleared reset pension zeros on ${cleared} profiles`);
  }

  /**
   * Restores the old values only where all three are still null: an answer saved since is the
   * person's and is kept. Then drops the image. Nothing to do when up() skipped.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${RESET_PENSION_ZEROS_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `UPDATE "user_profiles" p
       SET "pension_percent" = b."old_pension_percent",
           "pension_employer_percent" = b."old_pension_employer_percent",
           "is_salary_sacrifice" = b."old_is_salary_sacrifice"
       FROM "${RESET_PENSION_ZEROS_BACKFILL_TABLE}" b
       WHERE b."profile_id" = p."id" AND p."pension_percent" IS NULL
         AND p."pension_employer_percent" IS NULL AND p."is_salary_sacrifice" IS NULL`,
    );
    await queryRunner.query(`DROP TABLE "${RESET_PENSION_ZEROS_BACKFILL_TABLE}"`);
  }
}
