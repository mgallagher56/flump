import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import { HOME_BACKFILL_TABLE } from "./BackfillPropertyKindAndMortgageLink1795470100000";

/**
 * System audit slice 4, migration 4 of 4, decision 8 option A (CH-1, L05): every account has a
 * history row from the month it was added. Creating an account now writes that row; this gives
 * one to each existing account that has none.
 *
 * The row is the account's balance today, in the Europe/London month the account was created,
 * with source `backfill`. An account with no history row has never had its balance edited, checked
 * in or imported (each of those writes a row), so today's balance is the figure it was added with.
 *
 * An account created after its newest recorded month (a month back-dated later, say July for an
 * account added in August) whose balance differs from that record gets the same row in the month
 * it was created. Without it, the first balance sync after deploy (decision 8 A) would move today's
 * balance back to the older record.
 *
 * Each row's id is recorded in `account_home_backfill`. down() deletes those rows while they still
 * hold source `backfill` (a row the user has since corrected is theirs and stays). Idempotent: a
 * second run finds no account without a row.
 */
export const HISTORY_MIGRATION_MARK = "history";

export class BackfillFirstHistoryRow1795470300000 implements MigrationInterface {
  name = "BackfillFirstHistoryRow1795470300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `WITH added AS (
         INSERT INTO "account_details"
           ("account_id", "user_id", "year", "month", "value", "as_of_date", "source", "updated_at")
         SELECT a."id", a."user_id",
                EXTRACT(YEAR FROM (a."created_at" AT TIME ZONE 'Europe/London'))::int,
                EXTRACT(MONTH FROM (a."created_at" AT TIME ZONE 'Europe/London'))::int,
                a."balance", (a."created_at" AT TIME ZONE 'Europe/London')::date, 'backfill', now()
         FROM "accounts" a
         WHERE NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id" = a."id")
            OR EXISTS (
              SELECT 1 FROM (
                SELECT DISTINCT ON (d."account_id") d."year", d."month", d."value"
                FROM "account_details" d WHERE d."account_id" = a."id"
                ORDER BY d."account_id", d."year" DESC, d."month" DESC
              ) n
              WHERE n."value" IS DISTINCT FROM a."balance"
                AND n."year" * 12 + n."month" <
                    EXTRACT(YEAR FROM (a."created_at" AT TIME ZONE 'Europe/London'))::int * 12
                    + EXTRACT(MONTH FROM (a."created_at" AT TIME ZONE 'Europe/London'))::int
            )
         RETURNING "id", "account_id"
       )
       INSERT INTO "${HOME_BACKFILL_TABLE}" ("migration", "account_id", "detail_id")
       SELECT '${HISTORY_MIGRATION_MARK}', "account_id", "id" FROM added`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const exists: Array<{ t: string | null }> = await queryRunner.query(
      "SELECT to_regclass($1) AS t",
      [`public.${HOME_BACKFILL_TABLE}`],
    );
    if (!exists[0]?.t) return;
    await queryRunner.query(
      `DELETE FROM "account_details" d USING "${HOME_BACKFILL_TABLE}" b
       WHERE b."migration" = '${HISTORY_MIGRATION_MARK}' AND d."id" = b."detail_id"
         AND d."source" = 'backfill'`,
    );
    await queryRunner.query(
      `DELETE FROM "${HOME_BACKFILL_TABLE}" WHERE "migration" = '${HISTORY_MIGRATION_MARK}'`,
    );
  }
}
