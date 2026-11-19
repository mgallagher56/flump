import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import { buyToLetProfileColumnsPresent } from "../integrity/profile-column-drop";

/**
 * System audit slice 4, migration 2 of 4: fills in what the name test and the profile used to
 * guess, so figures read a saved choice instead (L71, HM-3, DB-6).
 *
 * 1. A Property with no kind becomes `rental` when its name says buy to let (the old name test,
 *    `isBuyToLetAccountName`). Otherwise, when it is the user's only such property and no property
 *    is already the home: `home` if the profile says they own their home (housing status
 *    `mortgage` or `own_outright`), else `rental` if the profile holds buy-to-let figures (the
 *    property they let, which migration 3 must not copy a second time). Anything else stays
 *    without a kind: two or more possible homes, or one property with neither signal, so the
 *    "more than one could be the home" fallback still applies.
 * 2. A Mortgage with no kind becomes `btl_mortgage` by the same name test. Otherwise it is
 *    `residential_mortgage` (how every figure already read it), except the user's only such
 *    mortgage when the profile holds buy-to-let figures and the housing status is not `mortgage`:
 *    that one is the buy-to-let mortgage.
 * 3. Where a user has exactly one mortgage and one property of a kind (home with residential,
 *    rental with buy to let), the mortgage is linked to the property.
 * 4. A residential mortgage's repayment type comes from `user_profiles.mortgage_type`, which the
 *    Mortgage page showed for it, only when it is the user's only residential mortgage (the
 *    coordinator's ruling, 19 November 2026: with several there is no way to tell which it
 *    described, so none is set). A buy-to-let mortgage's comes from
 *    `user_profiles.buy_to_let_mortgage_type`, only where the buy-to-let tab was used (a balance or
 *    rate saved there); otherwise the column default is not an answer and stays not set.
 *
 * Every change is recorded first in the before-image table `account_home_backfill` (created
 * here, and also used by migrations 3 and 4), with the values it replaced. down() puts them back
 * and drops the table. Rows go with their account (ON DELETE CASCADE), so erasure needs nothing
 * extra. Idempotent: only empty columns are filled, so a second run changes nothing.
 */
export const HOME_BACKFILL_TABLE = "account_home_backfill";
export const KIND_MIGRATION_MARK = "kind";

/** The old `isBuyToLetAccountName` rule in Postgres regex form (\m and \M are word edges). */
const BTL_NAME = `"name" ~* '\\mbuy[[:space:]-]*to[[:space:]-]*let\\M|\\mbtl\\M'`;
/** The profile (alias u) says the person owns their home. */
const OWNS_HOME = `COALESCE(u."housing_status", '') IN ('mortgage', 'own_outright')`;
/**
 * The profile (alias u) holds figures from the old buy-to-let tab. Slice 9 dropped those columns;
 * where they are gone (a re-run, or a database built by synchronize) no profile holds any, so the
 * buy-to-let tests below become false and the repayment type is never taken from them.
 */
const btlSql = (present: boolean) => ({
  hasFigures: present
    ? `(COALESCE(u."buy_to_let_property_value", 0) > 0 OR COALESCE(u."buy_to_let_mortgage_balance", 0) > 0)`
    : "false",
  type: present ? `u."buy_to_let_mortgage_type"` : "NULL::varchar",
  typeUsable: present
    ? `u."buy_to_let_mortgage_type" IN ('repayment', 'interest-only')
                       AND (u."buy_to_let_mortgage_balance" IS NOT NULL OR u."buy_to_let_mortgage_rate" IS NOT NULL)`
    : "false",
});

export class BackfillPropertyKindAndMortgageLink1795470100000 implements MigrationInterface {
  name = "BackfillPropertyKindAndMortgageLink1795470100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${HOME_BACKFILL_TABLE}" (
         "id" serial PRIMARY KEY,
         "migration" varchar(16) NOT NULL,
         "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
         "detail_id" integer,
         "old_account_subtype" varchar,
         "old_linked_account_id" uuid,
         "old_repayment_type" varchar,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_${HOME_BACKFILL_TABLE}_account" ON "${HOME_BACKFILL_TABLE}" ("account_id")`,
    );
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    const btl = btlSql(await buyToLetProfileColumnsPresent(queryRunner));
    const HAS_BTL_FIGURES = btl.hasFigures;

    // The targets are worked out before anything changes, then each change is recorded with the
    // value it replaces and applied in the same statement.
    const record = (targets: string, set: string): Promise<unknown> =>
      queryRunner.query(
        `WITH t AS (${targets}),
         img AS (
           INSERT INTO "${HOME_BACKFILL_TABLE}"
             ("migration", "account_id", "old_account_subtype", "old_linked_account_id", "old_repayment_type")
           SELECT '${KIND_MIGRATION_MARK}', a."id", a."account_subtype", a."linked_account_id", a."repayment_type"
           FROM "accounts" a JOIN t ON t."id" = a."id"
         )
         UPDATE "accounts" a SET ${set} FROM t WHERE a."id" = t."id"`,
      );

    // 1. Property kind.
    await record(
      `SELECT p."id",
              CASE WHEN p.${BTL_NAME} THEN 'rental' WHEN ${OWNS_HOME} THEN 'home' ELSE 'rental' END AS "kind"
       FROM "accounts" p LEFT JOIN "user_profiles" u ON u."user_id" = p."user_id"
       WHERE p."type" = 'Property' AND p."account_subtype" IS NULL
         AND (p.${BTL_NAME}
              OR ((SELECT count(*) FROM "accounts" o
                    WHERE o."user_id" = p."user_id" AND o."type" = 'Property'
                      AND o."account_subtype" IS NULL AND NOT (o.${BTL_NAME})) = 1
                  AND NOT EXISTS (SELECT 1 FROM "accounts" h
                    WHERE h."user_id" = p."user_id" AND h."type" = 'Property'
                      AND h."account_subtype" = 'home')
                  AND (${OWNS_HOME} OR ${HAS_BTL_FIGURES})))`,
      `"account_subtype" = t."kind"`,
    );
    // 2. Mortgage kind.
    await record(
      `SELECT m."id",
              CASE WHEN m.${BTL_NAME} THEN 'btl_mortgage'
                   WHEN ${HAS_BTL_FIGURES} AND COALESCE(u."housing_status", '') <> 'mortgage'
                        AND (SELECT count(*) FROM "accounts" o
                              WHERE o."user_id" = m."user_id" AND o."type" = 'Mortgage'
                                AND o."account_subtype" IS NULL AND NOT (o.${BTL_NAME})) = 1
                        AND NOT EXISTS (SELECT 1 FROM "accounts" b
                              WHERE b."user_id" = m."user_id" AND b."type" = 'Mortgage'
                                AND (b."account_subtype" = 'btl_mortgage'
                                     OR (b."account_subtype" IS NULL AND b.${BTL_NAME})))
                   THEN 'btl_mortgage'
                   ELSE 'residential_mortgage' END AS "kind"
       FROM "accounts" m LEFT JOIN "user_profiles" u ON u."user_id" = m."user_id"
       WHERE m."type" = 'Mortgage' AND m."account_subtype" IS NULL`,
      `"account_subtype" = t."kind"`,
    );
    // 3. The link, where exactly one mortgage and one property of a kind exist.
    await record(
      `SELECT m."id", p."id" AS "property_id"
       FROM "accounts" m
       JOIN "accounts" p ON p."user_id" = m."user_id" AND p."type" = 'Property'
         AND p."account_subtype" = CASE m."account_subtype" WHEN 'btl_mortgage' THEN 'rental' ELSE 'home' END
       WHERE m."type" = 'Mortgage' AND m."linked_account_id" IS NULL
         AND m."account_subtype" IN ('residential_mortgage', 'btl_mortgage')
         AND (SELECT count(*) FROM "accounts" x WHERE x."user_id" = m."user_id"
               AND x."type" = 'Mortgage' AND x."account_subtype" = m."account_subtype") = 1
         AND (SELECT count(*) FROM "accounts" y WHERE y."user_id" = m."user_id"
               AND y."type" = 'Property' AND y."account_subtype" = p."account_subtype") = 1`,
      `"linked_account_id" = t."property_id"`,
    );
    // 4. Repayment type from the profile.
    await record(
      `SELECT m."id",
              CASE WHEN m."account_subtype" = 'btl_mortgage' THEN ${btl.type}
                   ELSE u."mortgage_type" END AS "repayment"
       FROM "accounts" m JOIN "user_profiles" u ON u."user_id" = m."user_id"
       WHERE m."type" = 'Mortgage' AND m."repayment_type" IS NULL
         AND CASE WHEN m."account_subtype" = 'btl_mortgage'
                  THEN ${btl.typeUsable}
                  ELSE u."mortgage_type" IN ('repayment', 'interest-only')
                       AND (SELECT count(*) FROM "accounts" r WHERE r."user_id" = m."user_id"
                             AND r."type" = 'Mortgage'
                             AND r."account_subtype" = 'residential_mortgage') = 1 END`,
      `"repayment_type" = t."repayment"`,
    );
  }

  /** Puts back every value this migration replaced, then drops the before-image table. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const exists: Array<{ t: string | null }> = await queryRunner.query(
      "SELECT to_regclass($1) AS t",
      [`public.${HOME_BACKFILL_TABLE}`],
    );
    if (!exists[0]?.t) return;
    // Oldest image first per account: an account changed by several steps keeps the value it had
    // before the first of them.
    await queryRunner.query(
      `UPDATE "accounts" a
       SET "account_subtype" = b."old_account_subtype",
           "linked_account_id" = b."old_linked_account_id",
           "repayment_type" = b."old_repayment_type"
       FROM (SELECT DISTINCT ON ("account_id") *
               FROM "${HOME_BACKFILL_TABLE}" WHERE "migration" = '${KIND_MIGRATION_MARK}'
              ORDER BY "account_id", "id") b
       WHERE a."id" = b."account_id"`,
    );
    await queryRunner.query(`DROP TABLE "${HOME_BACKFILL_TABLE}"`);
  }
}
