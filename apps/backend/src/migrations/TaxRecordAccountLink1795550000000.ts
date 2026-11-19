import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 7 (docs/audit/system-2026-11/PLAN.md): a tax record can name the account it
 * describes, so Self Assessment groups records by property or savings account.
 *
 * Up:
 *   1. `tax_records.account_id uuid NULL`. Nullable with no default, so adding it is metadata-only
 *      and every existing record reads as not linked: no figure changes.
 *   2. A foreign key on (account_id, user_id) to accounts (id, user_id), so a record can only
 *      point at its own user's account, in the database as well as in the service (the same key
 *      budget_entries.link_account_id has). It needs the unique index on accounts (id, user_id)
 *      slice 5 added (created here too if it is missing). Deleting the account sets only
 *      `account_id` to null (`ON DELETE SET NULL (column)`, Postgres 15 and later): the record
 *      stays, unlinked.
 *   3. An index on (account_id, user_id), which leads with the foreign key's first column, so
 *      deleting an account finds its records without a scan; it also serves a user's records for
 *      one account. A second index on (user_id, account_id) would duplicate it and draw the
 *      planner away from IDX_tax_records_user_date for the list of a user's records.
 *
 * Re-running ends in the same state: the column and index are created only when missing and
 * the key is dropped and re-added. The log line is a count only.
 *
 * Down drops the index, the key and the column (any links are lost; the records stay). The
 * unique index on accounts belongs to slice 5's migration.
 */
export const TAX_RECORD_ACCOUNT_COLUMN = "account_id";
export const TAX_RECORD_ACCOUNT_FOREIGN_KEY = "FK_tax_records_account";
export const TAX_RECORD_ACCOUNT_OWNER_INDEX = "IDX_tax_records_account_user";
const ACCOUNTS_OWNER_KEY_INDEX = "UQ_accounts_id_user_id";

export class TaxRecordAccountLink1795550000000 implements MigrationInterface {
  name = "TaxRecordAccountLink1795550000000";

  private readonly logger = new Logger("TaxRecordAccountLink");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    // Every lock up front, in one order, held briefly (both tables are small), so no lock is
    // upgraded part way through: the key takes SHARE ROW EXCLUSIVE on accounts, and the column,
    // key and indexes need ACCESS EXCLUSIVE on tax_records.
    await queryRunner.query(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(`LOCK TABLE "tax_records" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(
      `ALTER TABLE "tax_records" ADD COLUMN IF NOT EXISTS "${TAX_RECORD_ACCOUNT_COLUMN}" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${ACCOUNTS_OWNER_KEY_INDEX}" ON "accounts" ("id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_records" DROP CONSTRAINT IF EXISTS "${TAX_RECORD_ACCOUNT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_records" ADD CONSTRAINT "${TAX_RECORD_ACCOUNT_FOREIGN_KEY}"
       FOREIGN KEY ("${TAX_RECORD_ACCOUNT_COLUMN}", "user_id") REFERENCES "accounts" ("id", "user_id")
       ON DELETE SET NULL ("${TAX_RECORD_ACCOUNT_COLUMN}")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "${TAX_RECORD_ACCOUNT_OWNER_INDEX}" ON "tax_records" ("${TAX_RECORD_ACCOUNT_COLUMN}", "user_id")`,
    );
    const [row]: Array<{ n: number }> = await queryRunner.query(
      `SELECT count(*)::int AS n FROM "tax_records" WHERE "${TAX_RECORD_ACCOUNT_COLUMN}" IS NOT NULL`,
    );
    // A count only: never ids, names or amounts.
    this.logger.log(`Tax records linked to an account: ${row?.n ?? 0}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "tax_records" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(`DROP INDEX IF EXISTS "${TAX_RECORD_ACCOUNT_OWNER_INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "tax_records" DROP CONSTRAINT IF EXISTS "${TAX_RECORD_ACCOUNT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tax_records" DROP COLUMN IF EXISTS "${TAX_RECORD_ACCOUNT_COLUMN}"`,
    );
  }
}
