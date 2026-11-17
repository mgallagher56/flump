import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * E33 Slice S2: persistent user retirement plan table (one row per user, versioned by updated_at).
 */
const RETIREMENT_DOWN_REFUSAL =
  "retirement_plans contains saved plans; export or remove them before reverting";

export class AddRetirementPlan1795260000000 implements MigrationInterface {
  name = "AddRetirementPlan1795260000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "retirement_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "retirement_age" integer,
        "plan_to_age" integer,
        "target" jsonb,
        "housing_override" jsonb,
        "state_pension_age" integer,
        "state_pension_annual_forecast_gbp" numeric(12,2),
        "state_pension_qualifying_years" integer,
        "growth_rates" jsonb NOT NULL DEFAULT '{"lower":0.02,"middle":0.05,"higher":0.08}'::jsonb,
        "inflation_rate" numeric(6,4) NOT NULL DEFAULT 0.02,
        "cash_savings_nominal_rate" numeric(6,4),
        "real_rent_growth_rate" numeric(6,4) NOT NULL DEFAULT 0,
        "excluded_account_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_retirement_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_retirement_plans_ages" CHECK ("retirement_age" IS NULL OR "plan_to_age" IS NULL OR "plan_to_age" > "retirement_age")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_retirement_plans_user_id" ON "retirement_plans" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Dropping the table would delete every saved retirement plan. While any row exists the revert
    // is refused unchanged. The table check comes first so a table already gone is not an error.
    // The ACCESS EXCLUSIVE lock is taken before the row check, so no plan can be saved between
    // the check and the drop; lock_timeout makes it fail fast rather than queue behind a writer.
    const table: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT to_regclass('"retirement_plans"') IS NOT NULL AS "found"`,
    );
    if (table[0]?.found) {
      await queryRunner.query("SET LOCAL lock_timeout = '10s'");
      await queryRunner.query(`LOCK TABLE "retirement_plans" IN ACCESS EXCLUSIVE MODE`);
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM "retirement_plans") AS "found"`,
      );
      if (rows[0]?.found) {
        throw new Error(RETIREMENT_DOWN_REFUSAL);
      }
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_retirement_plans_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retirement_plans"`);
  }
}
