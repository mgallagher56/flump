import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * The retention purge's last-run record (D5 revised, 25 Nov 2026). One row (id 1), written by
 * every purge run, from the backend's own schedule or the optional Railway cron. It holds times,
 * the trigger and counts per policy only: no user id and nothing about a person. `/health/ready`
 * reports the age of the last successful run from it, and the schedule reads it to decide whether
 * a run is due. No entity maps it (`jobs/retention.ts` uses raw SQL), so it is listed with the
 * other migration-only tables in migrations.integration.spec.ts.
 *
 * Additive only. down() drops the table; the purge skips the record while the table is missing.
 */
export class RetentionRuns1795660000000 implements MigrationInterface {
  name = "RetentionRuns1795660000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "retention_runs" (
         "id" smallint NOT NULL DEFAULT 1,
         "last_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "last_outcome" text NOT NULL,
         "last_trigger" text NOT NULL,
         "last_success_at" TIMESTAMP WITH TIME ZONE,
         "last_deleted" jsonb NOT NULL DEFAULT '{}'::jsonb,
         "inactive_accounts_due" integer,
         CONSTRAINT "PK_retention_runs" PRIMARY KEY ("id"),
         CONSTRAINT "CHK_retention_runs_one_row" CHECK ("id" = 1),
         CONSTRAINT "CHK_retention_runs_outcome" CHECK ("last_outcome" IN ('ok', 'failed')),
         CONSTRAINT "CHK_retention_runs_trigger" CHECK ("last_trigger" IN ('schedule', 'command'))
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DROP TABLE IF EXISTS "retention_runs"`);
  }
}
