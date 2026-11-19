import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 9 (DB-6): `accounts.type` is one of the eleven account types. Every writer
 * (the API, bank sync and the slice 4 migrations) already stores one of them; until now only the
 * API contract said so.
 *
 * Up counts the accounts whose type is not one of the eleven and logs the count only. When it is
 * 0 it adds `CHK_accounts_type`. When it is not, it stops with that count and changes nothing:
 * a check added NOT VALID would make every later update of such an account fail (Postgres checks
 * a row's checks on every update), and rewriting a stored type is an owner decision. Re-running
 * drops and re-adds the check. Down drops it.
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
export const ACCOUNT_TYPE_REFUSAL =
  "AccountTypeCheck1795510100000: accounts with a type outside the eleven account types";

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
    new Logger(this.name).log(`Accounts with a type outside the eleven: ${outside}`);
    if (outside > 0) {
      throw new Error(`${ACCOUNT_TYPE_REFUSAL}: ${outside}. Nothing was changed.`);
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
