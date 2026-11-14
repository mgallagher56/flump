import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";
import {
  ACCOUNTS_CHECK,
  BEFORE_IMAGE_TABLE,
  DETAIL_TRIGGER,
  describeLiabilitySignPlan,
  planLiabilitySignBackfill,
  TYPE_TRIGGER,
  LIABILITY_TYPES_SQL as TYPES_SQL,
} from "../integrity/liability-sign-backfill";

const DETAIL_FN = "flump_check_liability_detail_sign";
const TYPE_FN = "flump_check_liability_type_change";

// BE-05 (backend audit 2026-11, finding H6; E23 C-15): a liability is stored as minus its absolute
// value, in `accounts.balance` and in every `account_details.value` of that account. Account
// creation skipped the rule, so existing liabilities may be stored positive. This migration:
//   1. re-signs every positive liability balance and history value (idempotent: only rows with
//      value > 0 change, so a second run changes nothing);
//   2. records a before-image of every changed row in `liability_sign_backfill`, so down()
//      restores the old signs exactly (rows deleted with their account by ON DELETE CASCADE);
//   3. adds a CHECK on `accounts` and a deferred constraint trigger on `account_details` (plus one
//      on `accounts` for a type change) so a wrong-sign row can never be written again.
// It logs counts per table and type, never ids or amounts. Live-safe: it takes a write lock on
// both tables (reads continue) with a lock timeout, so it fails fast instead of queueing behind a
// long transaction, and both tables are small. The owner runs the backup drill (BE-03) and the
// dry run (`bun run --cwd apps/backend liability-signs:dry-run`) before deploying it.
//
// The liability type list is frozen in ../snapshots/liability-sign-backfill.ts (see there).

export class LiabilitySignRule1794358050000 implements MigrationInterface {
  name = "LiabilitySignRule1794358050000";

  private readonly logger = new Logger("LiabilitySignRule");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    // Fail fast rather than queue behind a long transaction (and block readers behind us).
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    // Blocks writes (never reads) until commit, so no row can be written with the old sign
    // between the backfill and the checks.
    await queryRunner.query(`LOCK TABLE "accounts", "account_details" IN SHARE ROW EXCLUSIVE MODE`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${BEFORE_IMAGE_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
         "table_name" varchar(16) NOT NULL CHECK ("table_name" IN ('accounts', 'account_details')),
         "row_id" varchar NOT NULL,
         "old_value" numeric(12,2) NOT NULL,
         "new_value" numeric(12,2) NOT NULL,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_${BEFORE_IMAGE_TABLE}_account" ON "${BEFORE_IMAGE_TABLE}" ("account_id")`,
    );

    const plan = await planLiabilitySignBackfill(queryRunner);

    await queryRunner.query(
      `WITH changed AS (
         UPDATE "accounts" SET "balance" = -"balance"
         WHERE "type" IN (${TYPES_SQL}) AND "balance" > 0
         RETURNING "id", "balance"
       )
       INSERT INTO "${BEFORE_IMAGE_TABLE}" ("account_id", "table_name", "row_id", "old_value", "new_value")
       SELECT "id", 'accounts', "id"::text, -"balance", "balance" FROM changed`,
    );
    await queryRunner.query(
      `WITH changed AS (
         UPDATE "account_details" d SET "value" = -d."value"
         FROM "accounts" a
         WHERE a."id"::text = d."account_id"::text AND a."type" IN (${TYPES_SQL}) AND d."value" > 0
         RETURNING d."id", a."id" AS "account_id", d."value"
       )
       INSERT INTO "${BEFORE_IMAGE_TABLE}" ("account_id", "table_name", "row_id", "old_value", "new_value")
       SELECT "account_id", 'account_details', "id"::text, -"value", "value" FROM changed`,
    );

    // Every row now satisfies the rule, so the CHECK validates in the same transaction.
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${ACCOUNTS_CHECK}"`);
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "${ACCOUNTS_CHECK}"
       CHECK ("type" NOT IN (${TYPES_SQL}) OR "balance" <= 0)`,
    );

    // account_details has no type column, so a trigger looks the account up. It is a deferred
    // constraint trigger: it checks the row as it stands at commit, so a transaction may re-sign
    // history and change the account type in either order.
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "${DETAIL_FN}"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
       DECLARE
         current_value numeric;
         current_account varchar;
         account_type varchar;
       BEGIN
         SELECT d."value", d."account_id" INTO current_value, current_account
         FROM "account_details" d WHERE d."id" = NEW."id";
         -- Gone, or not positive: nothing to check (the common case costs one primary-key read).
         IF current_value IS NULL OR current_value <= 0 THEN
           RETURN NULL;
         END IF;
         -- account_id is text; only a uuid can name an account, and the cast keeps the index.
         IF current_account !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
           RETURN NULL;
         END IF;
         SELECT a."type" INTO account_type FROM "accounts" a WHERE a."id" = current_account::uuid;
         IF account_type IN (${TYPES_SQL}) THEN
           RAISE EXCEPTION 'liability history must be stored negative'
             USING ERRCODE = 'check_violation', CONSTRAINT = '${DETAIL_TRIGGER}';
         END IF;
         RETURN NULL;
       END $$`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS "${DETAIL_TRIGGER}" ON "account_details"`);
    await queryRunner.query(
      `CREATE CONSTRAINT TRIGGER "${DETAIL_TRIGGER}"
       AFTER INSERT OR UPDATE OF "value", "account_id" ON "account_details"
       DEFERRABLE INITIALLY DEFERRED
       FOR EACH ROW EXECUTE FUNCTION "${DETAIL_FN}"()`,
    );

    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "${TYPE_FN}"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
       DECLARE
         account_type varchar;
       BEGIN
         SELECT a."type" INTO account_type FROM "accounts" a WHERE a."id" = NEW."id";
         IF account_type IN (${TYPES_SQL}) AND EXISTS (
           SELECT 1 FROM "account_details" d WHERE d."account_id" = NEW."id"::text AND d."value" > 0
         ) THEN
           RAISE EXCEPTION 'liability history must be stored negative'
             USING ERRCODE = 'check_violation', CONSTRAINT = '${TYPE_TRIGGER}';
         END IF;
         RETURN NULL;
       END $$`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS "${TYPE_TRIGGER}" ON "accounts"`);
    await queryRunner.query(
      `CREATE CONSTRAINT TRIGGER "${TYPE_TRIGGER}"
       AFTER UPDATE OF "type" ON "accounts"
       DEFERRABLE INITIALLY DEFERRED
       FOR EACH ROW EXECUTE FUNCTION "${TYPE_FN}"()`,
    );

    // Counts only: never ids, names or amounts.
    this.logger.log(`Liability sign backfill re-signed:\n${describeLiabilitySignPlan(plan)}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts", "account_details" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "${TYPE_TRIGGER}" ON "accounts"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "${TYPE_FN}"()`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "${DETAIL_TRIGGER}" ON "account_details"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "${DETAIL_FN}"()`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "${ACCOUNTS_CHECK}"`);

    const hasImage: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
      [`public.${BEFORE_IMAGE_TABLE}`],
    );
    if (!hasImage[0]?.exists) return;
    // Restores the old sign only where the value is still the one the backfill wrote: a value the
    // user or a sync has changed since is theirs, and is left alone.
    await queryRunner.query(
      `UPDATE "accounts" a SET "balance" = b."old_value"
       FROM "${BEFORE_IMAGE_TABLE}" b
       WHERE b."table_name" = 'accounts' AND b."row_id" = a."id"::text AND a."balance" = b."new_value"`,
    );
    await queryRunner.query(
      `UPDATE "account_details" d SET "value" = b."old_value"
       FROM "${BEFORE_IMAGE_TABLE}" b
       WHERE b."table_name" = 'account_details' AND b."row_id" = d."id"::text
         AND d."value" = b."new_value"`,
    );
    await queryRunner.query(`DROP TABLE "${BEFORE_IMAGE_TABLE}"`);
  }
}
