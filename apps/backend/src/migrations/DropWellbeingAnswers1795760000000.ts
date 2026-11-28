import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * The wellbeing questions after a check-in were removed from the app (owner, 28 Nov 2026). This
 * drops what AddWellbeingAnswers1795740000000 added: the `wellbeing_answers` table (its primary key
 * and its feeling check go with it; it had no other index, no enum and no foreign key) and the
 * switch `user_profiles.wellbeing_questions`.
 *
 * The stored answers are deleted on purpose, with no before-image: they are people's data that the
 * owner chose not to keep. down() recreates the empty structure only, exactly as the add migration
 * made it; nothing can bring the answers back. Both steps are idempotent (IF EXISTS, IF NOT EXISTS).
 * The ALTER on user_profiles waits at most 10 s for its lock rather than queue every profile read
 * behind it.
 */
export class DropWellbeingAnswers1795760000000 implements MigrationInterface {
  name = "DropWellbeingAnswers1795760000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`DROP TABLE IF EXISTS "wellbeing_answers"`);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "wellbeing_questions"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
