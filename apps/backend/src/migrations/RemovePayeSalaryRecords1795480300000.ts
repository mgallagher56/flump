import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Slice 6: the saved profile salary (`user_profiles.annual_salary`) is the one salary figure, so
 * the legacy PAYE salary tax records (source 'paye', category 'paye_salary') go. For each user
 * with a profile:
 *   (a) when the profile salary is empty (null, or 0 or less, which the engine also reads as no
 *       salary), the latest yearly or monthly salary record (by date,
 *       then created_at) with an amount above 0 is copied into it: the amount for 'annual', the
 *       amount × 12 for 'monthly'. A one-off payslip is not a year's salary and is not copied;
 *   (b) every such record is deleted.
 * A record that carries a receipt is neither copied nor deleted (the engine already ignores it),
 * so no receipt is ever copied into the before-image; only its count is logged. Records of a user
 * with no profile are left alone (the engine ignores them too).
 *
 * The before-image `paye_salary_record_backfill` keeps each deleted record's own fields (never a
 * receipt column) as jsonb, and on the one row per user whose record was copied, the salary
 * written. It is kept 90 days by the retention job, and its rows go with the profile by ON DELETE
 * CASCADE. Only this migration's down() and the retention job read it. Idempotent: a second run
 * finds no record left to copy or delete. Logs counts only, never ids or amounts.
 */
export const PAYE_SALARY_RECORD_BACKFILL_TABLE = "paye_salary_record_backfill";

/** The record's own fields saved in the image; the receipt columns are left out on purpose. */
export const PAYE_SALARY_RECORD_FIELDS = [
  "id",
  "user_id",
  "type",
  "source",
  "category",
  "name",
  "amount",
  "frequency",
  "date",
  "end_date",
  "notes",
  "created_at",
  "updated_at",
] as const;

const LEGACY = `t."source" = 'paye' AND t."category" = 'paye_salary'`;
const HAS_RECEIPT = `(t."receipt_data" IS NOT NULL OR t."receipt_filename" IS NOT NULL OR t."receipt_mime_type" IS NOT NULL)`;
const FIELDS_JSON = `jsonb_build_object(${PAYE_SALARY_RECORD_FIELDS.map((f) => `'${f}', d."${f}"`).join(", ")})`;
const FIELDS_LIST = PAYE_SALARY_RECORD_FIELDS.map((f) => `"${f}"`).join(", ");
const FIELDS_FROM_RECORD = PAYE_SALARY_RECORD_FIELDS.map((f) => `r."${f}"`).join(", ");

export class RemovePayeSalaryRecords1795480300000 implements MigrationInterface {
  name = "RemovePayeSalaryRecords1795480300000";

  private readonly logger = new Logger("RemovePayeSalaryRecords");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `LOCK TABLE "user_profiles", "tax_records" IN SHARE ROW EXCLUSIVE MODE`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${PAYE_SALARY_RECORD_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
         "tax_record_id" uuid NOT NULL,
         "record" jsonb NOT NULL,
         "salary_copied" numeric(12,2) NULL,
         "old_annual_salary" numeric(12,2) NULL,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_${PAYE_SALARY_RECORD_BACKFILL_TABLE}_profile" ON "${PAYE_SALARY_RECORD_BACKFILL_TABLE}" ("profile_id")`,
    );

    const [{ kept }] = await queryRunner.query(
      `SELECT count(*)::int AS kept FROM "tax_records" t
       JOIN "user_profiles" p ON p."user_id" = t."user_id"
       WHERE ${LEGACY} AND ${HAS_RECEIPT}`,
    );

    const [{ salaries, removed }] = await queryRunner.query(
      `WITH doomed AS (
         SELECT t.*, p."id" AS "profile_id", p."annual_salary" AS "old_annual_salary",
                COALESCE(p."annual_salary", 0) <= 0 AS "salary_empty"
         FROM "tax_records" t JOIN "user_profiles" p ON p."user_id" = t."user_id"
         WHERE ${LEGACY} AND NOT ${HAS_RECEIPT}
       ), latest AS (
         SELECT DISTINCT ON ("profile_id") "profile_id", "id",
                CASE WHEN "frequency" = 'annual' THEN "amount" ELSE "amount" * 12 END AS "salary"
         FROM doomed
         WHERE "salary_empty" AND "frequency" IN ('annual', 'monthly') AND "amount" > 0
         ORDER BY "profile_id", "date" DESC, "created_at" DESC, "id" DESC
       ), image AS (
         INSERT INTO "${PAYE_SALARY_RECORD_BACKFILL_TABLE}" ("profile_id", "tax_record_id", "record", "salary_copied", "old_annual_salary")
         SELECT d."profile_id", d."id", ${FIELDS_JSON}, l."salary",
                CASE WHEN l."id" IS NULL THEN NULL ELSE d."old_annual_salary" END
         FROM doomed d LEFT JOIN latest l ON l."id" = d."id"
         RETURNING "profile_id", "tax_record_id", "salary_copied"
       ), salaries AS (
         UPDATE "user_profiles" p SET "annual_salary" = i."salary_copied"
         FROM image i WHERE i."profile_id" = p."id" AND i."salary_copied" IS NOT NULL
         RETURNING 1
       ), removed AS (
         DELETE FROM "tax_records" t USING image i WHERE t."id" = i."tax_record_id"
         RETURNING 1
       )
       SELECT (SELECT count(*) FROM salaries)::int AS salaries,
              (SELECT count(*) FROM removed)::int AS removed`,
    );
    this.logger.log(
      `copied ${salaries} salaries, removed ${removed} salary records, kept ${kept} with a receipt`,
    );
  }

  /**
   * Restores each deleted record from its saved fields (receipt columns null, as they were),
   * skipping an id that exists again, and puts back the old salary (null or 0) only where the
   * salary still equals the one up() copied. Then drops the image.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${PAYE_SALARY_RECORD_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `INSERT INTO "tax_records" (${FIELDS_LIST})
       SELECT ${FIELDS_FROM_RECORD}
       FROM "${PAYE_SALARY_RECORD_BACKFILL_TABLE}" b
       CROSS JOIN LATERAL jsonb_populate_record(NULL::"tax_records", b."record") r
       WHERE NOT EXISTS (SELECT 1 FROM "tax_records" t WHERE t."id" = r."id")`,
    );
    await queryRunner.query(
      `UPDATE "user_profiles" p SET "annual_salary" = b."old_annual_salary"
       FROM "${PAYE_SALARY_RECORD_BACKFILL_TABLE}" b
       WHERE b."profile_id" = p."id" AND b."salary_copied" IS NOT NULL
         AND p."annual_salary" = b."salary_copied"`,
    );
    await queryRunner.query(`DROP TABLE "${PAYE_SALARY_RECORD_BACKFILL_TABLE}"`);
  }
}
