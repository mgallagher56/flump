import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import { HOME_BACKFILL_TABLE } from "./BackfillPropertyKindAndMortgageLink1795470100000";

/**
 * System audit slice 4, migration 3 of 4, decision 4 option A (buy-to-let details live in
 * accounts only; HM-4, DB-1, L19, L20): the figures typed on the Mortgage page's old buy-to-let
 * tab become accounts, so they count in net worth and the tab can read them back.
 *
 * For each profile with a buy-to-let value or mortgage balance saved:
 * - a rental Property account "Buy-to-let property" holding `buy_to_let_property_value`, when the
 *   user has no rental property yet. Its share is the profile's `property_ownership_share` (the
 *   share used for rental tax, decision 6) when that is below 100.
 * - a buy-to-let Mortgage account "Buy-to-let mortgage" holding `buy_to_let_mortgage_balance`
 *   (stored negative, as every debt is), `buy_to_let_mortgage_rate` and the repayment type, when
 *   the user has no buy-to-let mortgage yet. It takes the rental's share, and is linked to it
 *   when the user then has exactly one rental property that no mortgage is linked to.
 *
 * A user whose properties could not all be given a kind by migration 2 (two or more possible
 * homes), or who has more than one mortgage, is skipped: one of those may already be the rental
 * or its mortgage under another name, and a copy would count it twice in net worth. They set it up
 * on Accounts instead. When the mortgage cannot be linked it still takes the profile's share.
 *
 * The profile columns are left as they are (slice 9 drops them). Each created account's id is
 * recorded in `account_home_backfill`; down() deletes exactly those accounts, with any history
 * rows written for them since (ON DELETE CASCADE). Idempotent: a user who already has a rental
 * property and a buy-to-let mortgage gets nothing new.
 */
export const BTL_MIGRATION_MARK = "btl";
export const BTL_PROPERTY_NAME = "Buy-to-let property";
export const BTL_MORTGAGE_NAME = "Buy-to-let mortgage";

/** The joint share the profile implies: 1 to 99 when below 100, else held solely. */
const SHARE = `CASE WHEN u."property_ownership_share" >= 1 AND u."property_ownership_share" < 100
                    THEN round(u."property_ownership_share")::int END`;

export class MoveBuyToLetProfileIntoAccounts1795470200000 implements MigrationInterface {
  name = "MoveBuyToLetProfileIntoAccounts1795470200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);

    await queryRunner.query(
      `WITH created AS (
         INSERT INTO "accounts"
           ("user_id", "name", "type", "account_subtype", "balance", "currency", "ownership", "share_percent")
         SELECT u."user_id", '${BTL_PROPERTY_NAME}', 'Property', 'rental',
                round(u."buy_to_let_property_value", 2), 'GBP',
                CASE WHEN (${SHARE}) IS NULL THEN 'sole' ELSE 'joint' END, ${SHARE}
         FROM "user_profiles" u
         WHERE u."buy_to_let_property_value" > 0
           AND NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."user_id" = u."user_id"
                             AND a."type" = 'Property' AND a."account_subtype" = 'rental')
           AND NOT EXISTS (SELECT 1 FROM "accounts" x WHERE x."user_id" = u."user_id"
                             AND x."type" = 'Property' AND x."account_subtype" IS NULL)
           AND (SELECT count(*) FROM "accounts" m WHERE m."user_id" = u."user_id"
                 AND m."type" = 'Mortgage') <= 1
         RETURNING "id"
       )
       INSERT INTO "${HOME_BACKFILL_TABLE}" ("migration", "account_id")
       SELECT '${BTL_MIGRATION_MARK}', "id" FROM created`,
    );

    await queryRunner.query(
      `WITH src AS (
         SELECT u.*, ${SHARE} AS "profile_share",
                (SELECT r."id" FROM "accounts" r
                  WHERE r."user_id" = u."user_id" AND r."type" = 'Property'
                    AND r."account_subtype" = 'rental'
                    AND NOT EXISTS (SELECT 1 FROM "accounts" l WHERE l."linked_account_id" = r."id")
                    AND (SELECT count(*) FROM "accounts" c WHERE c."user_id" = u."user_id"
                          AND c."type" = 'Property' AND c."account_subtype" = 'rental') = 1) AS "rental_id"
         FROM "user_profiles" u
         WHERE u."buy_to_let_mortgage_balance" > 0
           AND NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."user_id" = u."user_id"
                             AND a."type" = 'Mortgage' AND a."account_subtype" = 'btl_mortgage')
           AND NOT EXISTS (SELECT 1 FROM "accounts" x WHERE x."user_id" = u."user_id"
                             AND x."type" = 'Property' AND x."account_subtype" IS NULL)
           AND (SELECT count(*) FROM "accounts" m WHERE m."user_id" = u."user_id"
                 AND m."type" = 'Mortgage') <= 1
       ),
       created AS (
         INSERT INTO "accounts"
           ("user_id", "name", "type", "account_subtype", "balance", "interest_rate", "currency",
            "repayment_type", "linked_account_id", "ownership", "share_percent")
         SELECT s."user_id", '${BTL_MORTGAGE_NAME}', 'Mortgage', 'btl_mortgage',
                -round(abs(s."buy_to_let_mortgage_balance"), 2), s."buy_to_let_mortgage_rate", 'GBP',
                CASE WHEN s."buy_to_let_mortgage_type" IN ('repayment', 'interest-only')
                     THEN s."buy_to_let_mortgage_type" END,
                s."rental_id",
                CASE WHEN r."id" IS NOT NULL THEN r."ownership"
                     WHEN s."profile_share" IS NOT NULL THEN 'joint' ELSE 'sole' END,
                CASE WHEN r."id" IS NOT NULL
                     THEN CASE WHEN r."ownership" = 'joint' THEN r."share_percent" END
                     ELSE s."profile_share" END
         FROM src s LEFT JOIN "accounts" r ON r."id" = s."rental_id"
         RETURNING "id"
       )
       INSERT INTO "${HOME_BACKFILL_TABLE}" ("migration", "account_id")
       SELECT '${BTL_MIGRATION_MARK}', "id" FROM created`,
    );
  }

  /** Deletes the accounts this migration created, by id, with their history. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const exists: Array<{ t: string | null }> = await queryRunner.query(
      "SELECT to_regclass($1) AS t",
      [`public.${HOME_BACKFILL_TABLE}`],
    );
    if (!exists[0]?.t) return;
    await queryRunner.query(
      `DELETE FROM "accounts" WHERE "id" IN
         (SELECT "account_id" FROM "${HOME_BACKFILL_TABLE}" WHERE "migration" = '${BTL_MIGRATION_MARK}')`,
    );
  }
}
