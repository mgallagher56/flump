import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Slice 6, owner decision 3: the pension rates 5% and 3% were row defaults, not answers, so every
 * profile still holding exactly that pair has its rates and salary sacrifice flag set back to null
 * ("not set"). The flag goes with them whatever it holds: it defaulted to true on old rows and to
 * false on newer ones, and both were row defaults. A person who really chose 5% and 3% is asked
 * again; the owner accepted that.
 *
 * Guard: the decision holds only while every stored 5/3 pair is a default (all data is tester
 * data today). So the migration changes no profile when it runs on or after
 * PENSION_DEFAULTS_CLEAR_BEFORE, nor when its before-image table already exists (it has run once:
 * a second run, say from a second instance in a rolling deploy, would clear answers saved since).
 * The table is created on the first run either way (empty after a skip), so it is also the
 * run-once marker and the retention job and erasure always find it.
 *
 * The before-image `pension_rates_backfill` keeps each changed row's old values for 90 days (the
 * retention job then removes it) so down() can restore them; its rows go with the profile by
 * ON DELETE CASCADE. Logs counts only, never ids or values.
 */
export const PENSION_DEFAULTS_CLEAR_BEFORE = "2027-01-01T00:00:00Z";
export const PENSION_RATES_BACKFILL_TABLE = "pension_rates_backfill";

export class ClearDefaultPensionRates1795480100000 implements MigrationInterface {
  name = "ClearDefaultPensionRates1795480100000";

  /**
   * The clock the cutoff is checked against. Unset (TypeORM's case) means the database's now();
   * a test sets it to check each side of the cutoff without mocking time.
   */
  now: Date | undefined = undefined;

  private readonly logger = new Logger("ClearDefaultPensionRates");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    // The image table doubles as the run-once marker: it exists only if up() has run before.
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${PENSION_RATES_BACKFILL_TABLE}`,
    ]);
    if (ran === true) {
      this.logger.log("skipped: already ran once");
      return;
    }

    // Blocks writes (never reads) until commit, so no answer can be saved between image and clear.
    await queryRunner.query(`LOCK TABLE "user_profiles" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `CREATE TABLE "${PENSION_RATES_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
         "old_pension_percent" numeric(7,4),
         "old_pension_employer_percent" numeric(7,4),
         "old_is_salary_sacrifice" boolean,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${PENSION_RATES_BACKFILL_TABLE}_profile" ON "${PENSION_RATES_BACKFILL_TABLE}" ("profile_id")`,
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
      `INSERT INTO "${PENSION_RATES_BACKFILL_TABLE}"
         ("profile_id", "old_pension_percent", "old_pension_employer_percent", "old_is_salary_sacrifice")
       SELECT "id", "pension_percent", "pension_employer_percent", "is_salary_sacrifice"
       FROM "user_profiles" WHERE "pension_percent" = 5 AND "pension_employer_percent" = 3`,
    );
    const [{ cleared }] = await queryRunner.query(
      `WITH changed AS (
         UPDATE "user_profiles" p
         SET "pension_percent" = NULL, "pension_employer_percent" = NULL, "is_salary_sacrifice" = NULL
         FROM "${PENSION_RATES_BACKFILL_TABLE}" b WHERE b."profile_id" = p."id"
         RETURNING 1
       )
       SELECT count(*)::int AS cleared FROM changed`,
    );
    this.logger.log(`cleared default pension rates on ${cleared} profiles`);
  }

  /**
   * Restores the old values only where all three are still null: an answer saved since is the
   * person's and is kept. Then drops the image. Nothing to do when up() skipped.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${PENSION_RATES_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `UPDATE "user_profiles" p
       SET "pension_percent" = b."old_pension_percent",
           "pension_employer_percent" = b."old_pension_employer_percent",
           "is_salary_sacrifice" = b."old_is_salary_sacrifice"
       FROM "${PENSION_RATES_BACKFILL_TABLE}" b
       WHERE b."profile_id" = p."id" AND p."pension_percent" IS NULL
         AND p."pension_employer_percent" IS NULL AND p."is_salary_sacrifice" IS NULL`,
    );
    await queryRunner.query(`DROP TABLE "${PENSION_RATES_BACKFILL_TABLE}"`);
  }
}
