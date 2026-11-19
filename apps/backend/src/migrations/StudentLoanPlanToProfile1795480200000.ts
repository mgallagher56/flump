import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Slice 6: the profile's `student_loan_plans` is the one place the student loan plan is saved.
 * Some people set a plan only on a Student Loan account (`accounts.student_loan_plan`). For each
 * profile that has not answered (`student_loan_plans IS NULL`; an empty string means the person
 * said they have no loan and is left alone), the distinct plans on that user's Student Loan
 * accounts are copied in, in the order below, comma-joined (TypeORM's simple-array format, as
 * the column already stores "PLAN_1,PLAN_2"). `accounts.student_loan_plan` is not changed.
 *
 * The before-image `student_loan_plan_backfill` (kept 90 days by the retention job, rows go with
 * the profile by ON DELETE CASCADE) lets down() put back the old null. Idempotent: a second run
 * finds no unanswered profile with a plan account left. Logs counts only.
 */
export const STUDENT_LOAN_PLANS_IN_ORDER = [
  "PLAN_1",
  "PLAN_2",
  "PLAN_4",
  "PLAN_5",
  "POSTGRAD",
] as const;
export const STUDENT_LOAN_PLAN_BACKFILL_TABLE = "student_loan_plan_backfill";

const PLANS_SQL = STUDENT_LOAN_PLANS_IN_ORDER.map((p) => `'${p}'`).join(", ");

export class StudentLoanPlanToProfile1795480200000 implements MigrationInterface {
  name = "StudentLoanPlanToProfile1795480200000";

  private readonly logger = new Logger("StudentLoanPlanToProfile");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "user_profiles", "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${STUDENT_LOAN_PLAN_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
         "old_student_loan_plans" text NULL,
         "new_student_loan_plans" text NOT NULL,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_${STUDENT_LOAN_PLAN_BACKFILL_TABLE}_profile" ON "${STUDENT_LOAN_PLAN_BACKFILL_TABLE}" ("profile_id")`,
    );
    const [{ copied }] = await queryRunner.query(
      `WITH plans AS (
         SELECT p."id" AS "profile_id",
                string_agg(a."plan", ',' ORDER BY array_position(ARRAY[${PLANS_SQL}]::text[], a."plan")) AS "plans"
         FROM "user_profiles" p
         JOIN (
           SELECT DISTINCT "user_id", "student_loan_plan" AS "plan" FROM "accounts"
           WHERE "type" = 'Student Loan' AND "student_loan_plan" IN (${PLANS_SQL})
         ) a ON a."user_id" = p."user_id"
         WHERE p."student_loan_plans" IS NULL
         GROUP BY p."id"
       ), image AS (
         INSERT INTO "${STUDENT_LOAN_PLAN_BACKFILL_TABLE}" ("profile_id", "old_student_loan_plans", "new_student_loan_plans")
         SELECT "profile_id", NULL, "plans" FROM plans
         RETURNING "profile_id", "new_student_loan_plans"
       ), changed AS (
         UPDATE "user_profiles" p SET "student_loan_plans" = image."new_student_loan_plans"
         FROM image WHERE p."id" = image."profile_id"
         RETURNING 1
       )
       SELECT count(*)::int AS copied FROM changed`,
    );
    this.logger.log(`copied a student loan plan to ${copied} profiles`);
  }

  /** Puts the old value back where the column still holds what up() wrote, then drops the image. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${STUDENT_LOAN_PLAN_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `UPDATE "user_profiles" p SET "student_loan_plans" = b."old_student_loan_plans"
       FROM "${STUDENT_LOAN_PLAN_BACKFILL_TABLE}" b
       WHERE b."profile_id" = p."id" AND p."student_loan_plans" = b."new_student_loan_plans"`,
    );
    await queryRunner.query(`DROP TABLE "${STUDENT_LOAN_PLAN_BACKFILL_TABLE}"`);
  }
}
