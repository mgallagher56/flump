import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E23 D22/D23 (plan section 6): one history row per account per month. Duplicates already in the
// table were being summed by readers, so they are removed first, keeping the newest row (max id)
// of each (account_id, year, month). The unique index is what the check-in upsert conflicts on.
// The deleted rows are not recoverable from `down`, which only drops the index.
const INDEX = "UQ_account_details_account_year_month";

export class UniqueAccountDetailMonth1794356000000 implements MigrationInterface {
  name = "UniqueAccountDetailMonth1794356000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `DELETE FROM "account_details" a
       USING "account_details" b
       WHERE a."account_id" = b."account_id"
         AND a."year" = b."year"
         AND a."month" = b."month"
         AND a."id" < b."id"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${INDEX}" ON "account_details" ("account_id", "year", "month")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(`DROP INDEX IF EXISTS "${INDEX}"`);
  }
}
