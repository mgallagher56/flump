import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * E33 Slice S2: persistent user retirement plan table (one row per user, versioned by updated_at).
 */
export class AddRetirementPlan1795200000000 implements MigrationInterface {
  name = "AddRetirementPlan1795200000000";

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
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_retirement_plans_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retirement_plans"`);
  }
}
