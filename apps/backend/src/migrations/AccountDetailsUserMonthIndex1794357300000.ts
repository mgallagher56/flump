import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// The agent's ranged reads (AgentDataService `ownedDetails`) filter `account_details` on user_id
// and then walk each account's rows in (year, month) order: DISTINCT ON for the carry-forward seed
// and LAG/ROW_NUMBER windows for coverage gaps. A single-column user_id index forced a sort per
// query; this composite index serves the filter and the order together. It covers every query the
// single-column IDX_account_details_user served (user_id is its leading column), so that index is
// dropped. down() restores it.
// A plain (not CONCURRENTLY) build: it blocks writes to account_details while it runs, which is
// brief at current table sizes and keeps it inside the migration transaction and advisory lock.
const INDEX = "IDX_account_details_user_account_year_month";
const OLD_INDEX = "IDX_account_details_user";

export class AccountDetailsUserMonthIndex1794357300000 implements MigrationInterface {
  name = "AccountDetailsUserMonthIndex1794357300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "${INDEX}" ON "account_details" ("user_id", "account_id", "year", "month")`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "${OLD_INDEX}"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "${OLD_INDEX}" ON "account_details" ("user_id")`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "${INDEX}"`);
  }
}
