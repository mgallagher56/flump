import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

export const ACCOUNT_GOALS_DOWN_REFUSAL =
  "account_goals has rows; export or remove them before reverting";

/**
 * E35 Set 2: optional user-set goal on an account (target amount, optional target date, optional
 * label). Cascades when its parent account is deleted.
 */
export class AddAccountGoals1795610000000 implements MigrationInterface {
  name = "AddAccountGoals1795610000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_goals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "account_id" uuid NOT NULL,
        "target_amount" numeric(12,2),
        "target_date" date,
        "label" character varying(120),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_goals_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_account_goals_account" FOREIGN KEY ("account_id", "user_id")
          REFERENCES "accounts" ("id", "user_id") ON DELETE CASCADE,
        CONSTRAINT "CHK_account_goals_target_amount" CHECK (
          "target_amount" IS NULL OR "target_amount" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_account_goals_account_id" ON "account_goals" ("account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_goals_user_account" ON "account_goals" ("user_id", "account_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const tables: Array<{ goals: boolean }> = await queryRunner.query(
      `SELECT to_regclass('"account_goals"') IS NOT NULL AS "goals"`,
    );
    if (tables[0]?.goals) {
      await queryRunner.query("SET LOCAL lock_timeout = '10s'");
      await queryRunner.query(`LOCK TABLE "account_goals" IN ACCESS EXCLUSIVE MODE`);
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM "account_goals") AS "found"`,
      );
      if (rows[0]?.found) {
        throw new Error(ACCOUNT_GOALS_DOWN_REFUSAL);
      }
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_goals_user_account"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_account_goals_account_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "account_goals"`);
  }
}
