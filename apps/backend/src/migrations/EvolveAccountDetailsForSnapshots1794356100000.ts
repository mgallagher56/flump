import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E30 PR1 (monthly snapshots): evolve `account_details` into the single monthly history source and
// add `snapshot_checkins`. Run the E18 backup drill before this reaches staging: step 1 and 2
// DELETE rows (rows with no owning account, and all but the latest write per account and month).
//
//   1. Delete rows that cannot be placed: no matching account (they could never be exported or
//      erased by user id), an impossible year/month, or a month in the future.
//   2. Collapse duplicates per (account_id, year, month), keeping the highest id (latest write).
//   3. Add user_id (backfilled from accounts), as_of_date (last day of the row's month, capped at today in London so no row is dated in the future),
//      source ('backfill': the provenance of old rows is unknown) and updated_at.
//   4. Add the month and source CHECKs, and the CHECK that year/month equal the
//      parts of as_of_date, so the Europe/London month key cannot drift from the date.
//   5. Create snapshot_checkins.
//
// down() removes the new structures and columns. The deleted duplicate and orphan rows are NOT
// restorable from here (restore from backup).
// The unique key (account_id, year, month) is E23's UQ_account_details_account_year_month index
// (UniqueAccountDetailMonth1794356000000); this migration relies on it and does not add another.
const CHECKS = [
  "CHK_account_details_month",
  "CHK_account_details_source",
  "CHK_account_details_as_of_month",
];

export class EvolveAccountDetailsForSnapshots1794356100000 implements MigrationInterface {
  name = "EvolveAccountDetailsForSnapshots1794356100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

    await queryRunner.query(
      `DELETE FROM "account_details" d
       WHERE NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."id"::text = d."account_id")
          OR d."month" NOT BETWEEN 1 AND 12
          OR d."year" NOT BETWEEN 1900 AND 2200
          OR d."year" * 12 + d."month" >
             EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/London')) * 12
             + EXTRACT(MONTH FROM (now() AT TIME ZONE 'Europe/London'))`,
    );
    await queryRunner.query(
      `DELETE FROM "account_details" d USING "account_details" k
       WHERE d."account_id" = k."account_id" AND d."year" = k."year" AND d."month" = k."month"
         AND d."id" < k."id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "account_details"
         ADD COLUMN IF NOT EXISTS "user_id" character varying,
         ADD COLUMN IF NOT EXISTS "as_of_date" date,
         ADD COLUMN IF NOT EXISTS "source" character varying NOT NULL DEFAULT 'manual',
         ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "account_details" d SET "user_id" = a."user_id"
       FROM "accounts" a WHERE a."id"::text = d."account_id" AND d."user_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "account_details"
       SET "as_of_date" = LEAST(
             (make_date("year", "month", 1) + INTERVAL '1 month' - INTERVAL '1 day')::date,
             (now() AT TIME ZONE 'Europe/London')::date
           ),
           "source" = 'backfill'
       WHERE "as_of_date" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "account_details" ALTER COLUMN "user_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "account_details" ALTER COLUMN "as_of_date" SET NOT NULL`);

    // Constraints are dropped first so a database built by synchronize (which already has them)
    // migrates cleanly, like the other migrations' IF NOT EXISTS guards.
    for (const name of CHECKS) {
      await queryRunner.query(`ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${name}"`);
    }
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${CHECKS[0]}" CHECK ("month" BETWEEN 1 AND 12)`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${CHECKS[1]}" CHECK ("source" IN ('onboarding', 'manual', 'connected', 'backfill'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${CHECKS[2]}" CHECK ("year" = EXTRACT(YEAR FROM "as_of_date") AND "month" = EXTRACT(MONTH FROM "as_of_date"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_details_user" ON "account_details" ("user_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "snapshot_checkins" (
         "user_id" character varying NOT NULL,
         "month" character varying NOT NULL,
         "completed_at" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_snapshot_checkins" PRIMARY KEY ("user_id", "month"),
         CONSTRAINT "CHK_snapshot_checkins_month" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(`DROP TABLE IF EXISTS "snapshot_checkins"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_details_user"`);
    for (const check of CHECKS) {
      await queryRunner.query(`ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${check}"`);
    }
    await queryRunner.query(
      `ALTER TABLE "account_details"
         DROP COLUMN IF EXISTS "updated_at",
         DROP COLUMN IF EXISTS "source",
         DROP COLUMN IF EXISTS "as_of_date",
         DROP COLUMN IF EXISTS "user_id"`,
    );
  }
}
