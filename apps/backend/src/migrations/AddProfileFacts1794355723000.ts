import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E23 D06/D07 (plan section 3.1, DECISIONS E23 D-3-B and D-4-C): the onboarding answers that were
// sent and silently dropped. Every column is nullable with no default, so adding them is
// metadata-only and existing rows read as "not set". CHECKs are added NOT VALID then validated.
const CHECKS: Array<[name: string, expr: string]> = [
  [
    "CHK_user_profiles_tax_region",
    `"tax_region" IN ('ENGLAND', 'WALES', 'SCOTLAND', 'NORTHERN_IRELAND')`,
  ],
  [
    "CHK_user_profiles_housing_status",
    `"housing_status" IN ('renting', 'mortgage', 'own_outright')`,
  ],
  ["CHK_user_profiles_birth_year", `"birth_year" BETWEEN 1900 AND 2100`],
];

export class AddProfileFacts1794355723000 implements MigrationInterface {
  name = "AddProfileFacts1794355723000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    const add = (column: string, type: string) =>
      queryRunner.query(`ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    await add("tax_region", "character varying");
    await add("birth_year", "smallint");
    await add("student_loan_plans", "text");
    await add("housing_status", "character varying");
    await add("monthly_housing_cost", "numeric(12,2)");
    await add("monthly_other_outgoings", "numeric(12,2)");
    for (const [name, expr] of CHECKS) {
      await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${name}"`);
      await queryRunner.query(
        `ALTER TABLE "user_profiles" ADD CONSTRAINT "${name}" CHECK (${expr}) NOT VALID`,
      );
      await queryRunner.query(`ALTER TABLE "user_profiles" VALIDATE CONSTRAINT "${name}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    for (const [name] of CHECKS) {
      await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${name}"`);
    }
    for (const column of [
      "monthly_other_outgoings",
      "monthly_housing_cost",
      "housing_status",
      "student_loan_plans",
      "birth_year",
      "tax_region",
    ]) {
      await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}
