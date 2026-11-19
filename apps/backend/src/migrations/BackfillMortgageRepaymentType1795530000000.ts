import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Applies rule 4 of BackfillPropertyKindAndMortgageLink1795470100000 again, for the residential
 * case only, to mortgages added since that ran: a mortgage with no repayment type takes
 * `user_profiles.mortgage_type` when it is the user's only residential mortgage (the
 * coordinator's ruling, 19 November 2026: with several there is no way to tell which the profile
 * described, so none is set). After this the profile's mortgage type is read by nothing (the
 * engine and the Mortgage page read the account's own repayment type, null meaning repayment), so
 * this is its last copy.
 *
 * "Residential" is how the engine reads an account (`isBuyToLetAccount`): kind
 * `residential_mortgage`, or no kind and a name the old buy-to-let name test does not match.
 * Slice 4 counted only `residential_mortgage` because its rule 2 had just given every mortgage a
 * kind; mortgages added since may have none, and the engine treats those as residential.
 *
 * Every change is recorded first in the before-image `mortgage_repayment_type_backfill` with the
 * value it replaced and the value it wrote, kept 90 days (the retention job then removes it) so
 * down() can undo it; rows go with the account by ON DELETE CASCADE. Idempotent: only empty
 * repayment types are filled, so a second run changes nothing. Logs counts only, never ids or
 * values.
 */
export const MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE = "mortgage_repayment_type_backfill";

/** The old `isBuyToLetAccountName` rule in Postgres regex form (\m and \M are word edges). */
const BTL_NAME = `"name" ~* '\\mbuy[[:space:]-]*to[[:space:]-]*let\\M|\\mbtl\\M'`;
/** The account (by alias) is a residential mortgage as the engine reads it. */
const RESIDENTIAL = (a: string): string =>
  `${a}."type" = 'Mortgage' AND (${a}."account_subtype" = 'residential_mortgage'
     OR (${a}."account_subtype" IS NULL AND NOT (${a}.${BTL_NAME})))`;

export class BackfillMortgageRepaymentType1795530000000 implements MigrationInterface {
  name = "BackfillMortgageRepaymentType1795530000000";

  private readonly logger = new Logger("BackfillMortgageRepaymentType");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    // Blocks writes (never reads) until commit, so no answer can be saved between image and fill.
    await queryRunner.query(`LOCK TABLE "accounts", "user_profiles" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
         "old_repayment_type" varchar NULL,
         "new_repayment_type" varchar NOT NULL,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}_account" ON "${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}" ("account_id")`,
    );
    const [{ filled }] = await queryRunner.query(
      `WITH t AS (
         SELECT m."id", m."repayment_type" AS "old", u."mortgage_type" AS "new"
         FROM "accounts" m JOIN "user_profiles" u ON u."user_id" = m."user_id"
         WHERE ${RESIDENTIAL("m")} AND m."repayment_type" IS NULL
           AND u."mortgage_type" IN ('repayment', 'interest-only')
           AND (SELECT count(*) FROM "accounts" r
                 WHERE r."user_id" = m."user_id" AND ${RESIDENTIAL("r")}) = 1
       ), image AS (
         INSERT INTO "${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}" ("account_id", "old_repayment_type", "new_repayment_type")
         SELECT "id", "old", "new" FROM t
         RETURNING "account_id", "new_repayment_type"
       ), changed AS (
         UPDATE "accounts" a SET "repayment_type" = image."new_repayment_type"
         FROM image WHERE a."id" = image."account_id"
         RETURNING 1
       )
       SELECT count(*)::int AS filled FROM changed`,
    );
    this.logger.log(`copied a repayment type to ${filled} mortgages`);
  }

  /**
   * Puts the old value back where the account still holds what up() wrote (an answer saved since
   * is the person's and is kept), then drops the image.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      `UPDATE "accounts" a SET "repayment_type" = b."old_repayment_type"
       FROM "${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}" b
       WHERE b."account_id" = a."id" AND a."repayment_type" = b."new_repayment_type"`,
    );
    await queryRunner.query(`DROP TABLE "${MORTGAGE_REPAYMENT_TYPE_BACKFILL_TABLE}"`);
  }
}
