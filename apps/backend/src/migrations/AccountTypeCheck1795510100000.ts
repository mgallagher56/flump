import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 9 (DB-6): `accounts.type` is one of the eleven account types. Every writer
 * (the API, bank sync and the slice 4 migrations) already stores one of them; until now only the
 * API contract said so.
 *
 * Up counts the accounts whose type is not one of the eleven and logs the count. When it is 0 it
 * adds `CHK_accounts_type`. When it is not, it adds nothing, changes no row, logs the distinct
 * off-list type names (at most ten; they are not personal data) and returns cleanly, so the deploy
 * and the migrations queued behind it go on; a later migration adds the check once those rows are
 * dealt with. It never adds the check NOT VALID: Postgres checks a row's checks on every update,
 * so every later update of such an account would fail. Rewriting a stored type is an owner
 * decision. Re-running drops and re-adds the check (or skips again). Down drops it.
 *
 * The list is frozen here, as a migration must be; `Account` declares the same check, and a unit
 * test keeps both equal to `ACCOUNT_TYPES` in the API contract.
 */
export const ACCOUNT_TYPE_CHECK = "CHK_accounts_type";
export const ACCOUNT_TYPES_AT_1795510100000 = [
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
  "Property",
  "Student Loan",
  "Overdraft",
] as const;
const TYPES_SQL = ACCOUNT_TYPES_AT_1795510100000.map((t) => `'${t}'`).join(", ");
export const ACCOUNT_TYPE_SKIPPED = `${ACCOUNT_TYPE_CHECK} not added and no row changed; a later migration adds it once these rows are dealt with.`;

export class AccountTypeCheck1795510100000 implements MigrationInterface {
  name = "AccountTypeCheck1795510100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    // Adding a check takes ACCESS EXCLUSIVE; taken once, before the count, so no account changes
    // type between the count and the check and no lock is upgraded part way. accounts is small.
    await queryRunner.query(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);

    const [row]: Array<{ n: number }> = await queryRunner.query(
      `SELECT count(*)::int AS n FROM "accounts" WHERE "type" NOT IN (${TYPES_SQL})`,
    );
    const outside = row?.n ?? 0;
    const log = new Logger(this.name);
    log.log(`Accounts with a type outside the eleven: ${outside}`);
    if (outside > 0) {
      // Type names, not personal data; at most ten, so the line stays short.
      const values: Array<{ type: string }> = await queryRunner.query(
        `SELECT DISTINCT "type" FROM "accounts" WHERE "type" NOT IN (${TYPES_SQL}) ORDER BY "type" LIMIT 10`,
      );
      log.warn(
        `${ACCOUNT_TYPE_SKIPPED} Off-list types: ${values.map((v) => JSON.stringify(v.type)).join(", ")}`,
      );
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${ACCOUNT_TYPE_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "${ACCOUNT_TYPE_CHECK}" CHECK ("type" IN (${TYPES_SQL}))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${ACCOUNT_TYPE_CHECK}"`,
    );
  }
}
