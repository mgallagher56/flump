import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 9 (DB-14): an `account_details` row's `user_id` must be its account's. Every
 * writer copies the owner's id today, but nothing in the database stopped a row naming another
 * user, and some reads filter on the row's own `user_id`.
 *
 * Up:
 *   1. Counts the rows whose `user_id` differs from their account's and logs the count only.
 *   2. Adds a foreign key on (account_id, user_id) to accounts (id, user_id), the unique index
 *      slice 5 added (`UQ_accounts_id_user_id`, created here too if it is missing). It is added
 *      NOT VALID, so the existing rows are not read while the tables are locked, then validated
 *      when the count was 0. Deleting an account still deletes its history (ON DELETE CASCADE,
 *      as `FK_account_details_account` does).
 *   3. When the count is not 0 the key stays NOT VALID and no row is changed: every new row, and
 *      every change to a row's account or user, is checked from now on; the old rows wait for an
 *      owner decision (stored data is never rewritten without one). The log says so.
 *
 * Re-running drops and re-adds the key, so it ends in the same state. Down drops the key only;
 * the unique index belongs to slice 5's migration.
 */
export const OWNER_KEY = "FK_account_details_account_owner";
const ACCOUNTS_OWNER_KEY_INDEX = "UQ_accounts_id_user_id";

export class AccountDetailsOwnerKey1795510000000 implements MigrationInterface {
  name = "AccountDetailsOwnerKey1795510000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const log = new Logger(this.name);
    // Every lock up front, in one order, at the strength adding the key needs on both tables
    // (SHARE ROW EXCLUSIVE), so nothing is upgraded part way and no row changes between the
    // count and the key. Reads go on while it is held.
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(`LOCK TABLE "account_details" IN SHARE ROW EXCLUSIVE MODE`);

    const [row]: Array<{ n: number }> = await queryRunner.query(
      `SELECT count(*)::int AS n
         FROM "account_details" d
         JOIN "accounts" a ON a."id" = d."account_id"
        WHERE a."user_id" <> d."user_id"`,
    );
    const mismatched = row?.n ?? 0;
    log.log(`History rows whose user differs from their account's: ${mismatched}`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${ACCOUNTS_OWNER_KEY_INDEX}" ON "accounts" ("id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${OWNER_KEY}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${OWNER_KEY}"
       FOREIGN KEY ("account_id", "user_id") REFERENCES "accounts" ("id", "user_id")
       ON DELETE CASCADE NOT VALID`,
    );
    if (mismatched === 0) {
      await queryRunner.query(`ALTER TABLE "account_details" VALIDATE CONSTRAINT "${OWNER_KEY}"`);
    } else {
      log.warn(
        `${OWNER_KEY} left NOT VALID: new and changed rows are checked, existing rows are unchanged`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${OWNER_KEY}"`,
    );
  }
}
