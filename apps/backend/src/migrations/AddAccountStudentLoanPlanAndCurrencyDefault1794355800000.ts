import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E23 D18/D19 (plan sections 1 and 3.1): Property, Student Loan and Overdraft account types need
// no schema change (type is a varchar), but a Student Loan carries its repayment plan. The column
// is nullable with no default and the currency default is a catalog change, so both are
// metadata-only. The CHECK is added NOT VALID then validated (every existing row is NULL).
const CHECK_NAME = "CHK_accounts_student_loan_plan";
const CHECK_EXPR = `"student_loan_plan" IN ('PLAN_1', 'PLAN_2', 'PLAN_4', 'PLAN_5', 'POSTGRAD')`;

export class AddAccountStudentLoanPlanAndCurrencyDefault1794355800000
  implements MigrationInterface
{
  name = "AddAccountStudentLoanPlanAndCurrencyDefault1794355800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "student_loan_plan" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${CHECK_NAME}"`);
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "${CHECK_NAME}" CHECK (${CHECK_EXPR}) NOT VALID`,
    );
    await queryRunner.query(`ALTER TABLE "accounts" VALIDATE CONSTRAINT "${CHECK_NAME}"`);
    await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "currency" SET DEFAULT 'GBP'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "currency" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${CHECK_NAME}"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "student_loan_plan"`);
  }
}
