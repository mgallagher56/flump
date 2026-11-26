import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

export const WELLBEING_ANSWERS_DOWN_REFUSAL =
  "wellbeing_answers has rows; export or remove them before reverting";
export const WELLBEING_SWITCH_DOWN_REFUSAL =
  "some profiles have the wellbeing questions switched off; reverting would switch them back on";

/**
 * E35 W5: the two optional questions after a check-in. Adds `wellbeing_answers` (at most one row
 * per person per Europe/London quarter, both answers null for a skip; no id, no timestamps) and the
 * switch `user_profiles.wellbeing_questions` (on by default). Additive only. The ALTER on
 * user_profiles waits at most 10 s for its lock rather than queue every profile read behind it.
 * The revert refuses while any answer is stored, or while anyone has switched the questions off
 * (dropping the column and adding it back would switch them on again for that person).
 */
export class AddWellbeingAnswers1795720000000 implements MigrationInterface {
  name = "AddWellbeingAnswers1795720000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wellbeing_answers" (
        "user_id" character varying NOT NULL,
        "quarter" date NOT NULL,
        "feeling" character varying(16),
        "worse_text" character varying(1000),
        CONSTRAINT "PK_wellbeing_answers" PRIMARY KEY ("user_id", "quarter"),
        CONSTRAINT "CHK_wellbeing_answers_feeling" CHECK (
          "feeling" IS NULL OR "feeling" IN ('more_in_control', 'about_the_same', 'more_worried')
        )
      )
    `);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "wellbeing_questions" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const tables: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT to_regclass('"wellbeing_answers"') IS NOT NULL AS "found"`,
    );
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    if (tables[0]?.found) {
      await queryRunner.query(`LOCK TABLE "wellbeing_answers" IN ACCESS EXCLUSIVE MODE`);
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM "wellbeing_answers") AS "found"`,
      );
      if (rows[0]?.found) {
        throw new Error(WELLBEING_ANSWERS_DOWN_REFUSAL);
      }
    }
    const columns: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'user_profiles' AND "column_name" = 'wellbeing_questions') AS "found"`,
    );
    if (columns[0]?.found) {
      await queryRunner.query(`LOCK TABLE "user_profiles" IN ACCESS EXCLUSIVE MODE`);
      const off: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM "user_profiles" WHERE "wellbeing_questions" = false) AS "found"`,
      );
      if (off[0]?.found) {
        throw new Error(WELLBEING_SWITCH_DOWN_REFUSAL);
      }
    }
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "wellbeing_questions"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "wellbeing_answers"`);
  }
}
