import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";
import {
  ACCOUNT_CHILD_TABLES,
  countAccountOrphans,
  describeAccountOrphans,
  orphanPredicate,
} from "../integrity/account-orphans";
import {
  DETAIL_TRIGGER,
  LIABILITY_TYPES_SQL,
  TYPE_TRIGGER,
} from "../snapshots/liability-sign-backfill";

const TYPE_FN = "flump_check_liability_type_change";
const DETAIL_FN = "flump_check_liability_detail_sign";

// BE-08 (backend audit 2026-11, finding M2; E1 D-06): `account_details.account_id` and
// `transactions.account_id` were `varchar` against the `uuid` key `accounts.id`, with no foreign
// key, so a failed or partial account delete left history no read can reach. This migration:
//   1. logs orphan counts per table (not a uuid / account missing / another user's account);
//   2. deletes those orphans: a row whose account does not exist for its own user is unreachable
//      by every read, and one pointing at another user's account must never become reachable;
//   3. converts both columns to `uuid` (`USING account_id::uuid`, safe once step 2 has run);
//   4. adds foreign keys to accounts(id) ON DELETE CASCADE, so deleting an account removes its
//      history in the same statement.
// Each FK column already leads an index (UQ_account_details_account_year_month and
// IDX_transactions_account), so a cascade or a parent delete never scans the child table.
//
// Locking: the type change rewrites both tables under an ACCESS EXCLUSIVE lock (reads wait). Both
// are small; `lock_timeout` makes the migration fail fast instead of queueing behind a long
// transaction (and stalling every reader behind it). The keys are added NOT VALID and then
// validated, so a synchronize-built database whose columns are already uuid validates under a
// SHARE UPDATE EXCLUSIVE lock only. The owner runs `bun run --cwd apps/backend
// account-orphans:report` before deploying to see what step 2 will delete.
//
// BE-05's trigger on account_details lists `account_id` in its UPDATE OF columns, which blocks a
// type change, so it is dropped and recreated around step 3; the accounts type-change function
// compared `account_id` with `id::text` and is replaced with a uuid comparison.
//
// down() drops the keys and restores `varchar` (and the text comparison). Deleted orphans are
// not restored: they were unreachable.
//
// Earlier migrations that join on account_id now compare both sides as text, which means the same
// on the varchar schema they were written for and also runs on a synchronize-built (uuid) one.
export class AccountIdForeignKeys1794358200000 implements MigrationInterface {
  name = "AccountIdForeignKeys1794358200000";

  private readonly logger = new Logger("AccountIdForeignKeys");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    // Take every lock up front, in one order, so the later DELETEs and ALTERs never upgrade a
    // weaker lock (which could deadlock against a concurrent writer). ADD FOREIGN KEY takes
    // SHARE ROW EXCLUSIVE on the referenced table.
    await queryRunner.query("LOCK TABLE accounts IN SHARE ROW EXCLUSIVE MODE");
    await queryRunner.query("LOCK TABLE account_details, transactions IN ACCESS EXCLUSIVE MODE");

    const counts = await countAccountOrphans(queryRunner);
    // Counts only: never ids, names or amounts.
    this.logger.log(
      `Account orphans found (deleted before the foreign keys):\n${describeAccountOrphans(counts)}`,
    );

    for (const { table } of ACCOUNT_CHILD_TABLES) {
      await queryRunner.query(`DELETE FROM "${table}" c WHERE ${orphanPredicate("c")}`);
    }

    const hadDetailTrigger = await this.dropDetailTrigger(queryRunner);
    for (const { table } of ACCOUNT_CHILD_TABLES) {
      if ((await columnType(queryRunner, table)) !== "uuid") {
        await queryRunner.query(
          `ALTER TABLE "${table}" ALTER COLUMN "account_id" TYPE uuid USING "account_id"::uuid`,
        );
      }
    }
    if (hadDetailTrigger) await this.createDetailTrigger(queryRunner);
    await this.replaceTypeFunction(queryRunner, `NEW."id"`);

    for (const { table, foreignKey } of ACCOUNT_CHILD_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${foreignKey}"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${foreignKey}"
         FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE NOT VALID`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${foreignKey}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    for (const { table, foreignKey } of [...ACCOUNT_CHILD_TABLES].reverse()) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${foreignKey}"`);
    }
    const hadDetailTrigger = await this.dropDetailTrigger(queryRunner);
    for (const { table } of ACCOUNT_CHILD_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "account_id" TYPE character varying USING "account_id"::text`,
      );
    }
    if (hadDetailTrigger) await this.createDetailTrigger(queryRunner);
    await this.replaceTypeFunction(queryRunner, `NEW."id"::text`);
  }

  /** Drops BE-05's account_details trigger if present; returns whether it was. */
  private async dropDetailTrigger(queryRunner: QueryRunner): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
       WHERE c.relname = 'account_details' AND t.tgname = $1`,
      [DETAIL_TRIGGER],
    );
    if (rows.length === 0) return false;
    await queryRunner.query(`DROP TRIGGER "${DETAIL_TRIGGER}" ON "account_details"`);
    return true;
  }

  /** Recreates the trigger exactly as LiabilitySignRule1794358050000 defines it. */
  private async createDetailTrigger(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE CONSTRAINT TRIGGER "${DETAIL_TRIGGER}"
       AFTER INSERT OR UPDATE OF "value", "account_id" ON "account_details"
       DEFERRABLE INITIALLY DEFERRED
       FOR EACH ROW EXECUTE FUNCTION "${DETAIL_FN}"()`,
    );
  }

  /**
   * LiabilitySignRule's accounts type-change check, with `account_id` compared against `idExpr`
   * (`NEW."id"` once the column is uuid, `NEW."id"::text` while it is varchar). Only replaced if
   * the function exists (a revert past BE-05 has already dropped it).
   */
  private async replaceTypeFunction(queryRunner: QueryRunner, idExpr: string): Promise<void> {
    const [{ present }] = await queryRunner.query(
      `SELECT to_regproc($1) IS NOT NULL AS "present"`,
      [`public.${TYPE_FN}`],
    );
    if (!present) return;
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "${TYPE_FN}"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
       DECLARE
         account_type varchar;
       BEGIN
         SELECT a."type" INTO account_type FROM "accounts" a WHERE a."id" = NEW."id";
         IF account_type IN (${LIABILITY_TYPES_SQL}) AND EXISTS (
           SELECT 1 FROM "account_details" d WHERE d."account_id" = ${idExpr} AND d."value" > 0
         ) THEN
           RAISE EXCEPTION 'liability history must be stored negative'
             USING ERRCODE = 'check_violation', CONSTRAINT = '${TYPE_TRIGGER}';
         END IF;
         RETURN NULL;
       END $$`,
    );
  }
}

async function columnType(queryRunner: QueryRunner, table: string): Promise<string | undefined> {
  const rows: Array<{ data_type: string }> = await queryRunner.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'account_id'`,
    [table],
  );
  return rows[0]?.data_type;
}
