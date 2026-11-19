import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 5, decision 1 option A (docs/audit/system-2026-11/PLAN.md): a budget line can
 * be linked to one savings or debt account and read its monthly saving or payment, instead of a
 * typed copy that goes stale.
 *
 * Up:
 *   1. `budget_entries.link_account_id uuid NULL`. Nullable with no default, so adding it is
 *      metadata-only and every existing row reads as not linked: no figure changes. Existing rows
 *      are never linked here: a typed plan figure is the person's own, and the page offers the link.
 *   2. A foreign key on (link_account_id, user_id) to accounts (id, user_id), so a line can only
 *      ever point at its own user's account, in the database as well as in the service. It needs
 *      a unique index on accounts (id, user_id), which `id` alone already guarantees (an index,
 *      not a constraint, and declared on the Account entity, so a synchronize-built database has
 *      the same shape). Deleting
 *      the account sets only `link_account_id` to null (`ON DELETE SET NULL (column)`, Postgres
 *      15 and later): the line stays, keeps its kind and reads "Not set" until the person types a
 *      figure or links another account. It never reads its stored £0.
 *   3. `link_kind` also allows 'savings' and 'debt'. A check keeps `link_account_id` to those two
 *      kinds. One line per account (a unique index on link_account_id and user_id, scoped to
 *      the user so a clash never says anything about another user's account; it leads with the
 *      foreign key's first column, so the key's delete lookups use it); the one-line-per-fact index now covers only take_home and
 *      housing, since a person can link a line to each of several accounts.
 *
 * Down: first writes each account-linked line's resolved amount into `amount` (the account's
 * monthly amount at the person's share, as `applyAccountShare` counts it: a joint account without
 * a share counts at 50%), stored as a sole monthly figure so it is counted once, and unlinks the
 * line. A line whose account is gone, has no saved monthly amount or no longer fits the kind was
 * "Not set" and keeps its stored £0: there is no figure to write. Then it drops what up added and
 * restores the earlier check and index.
 */
export const LINK_ACCOUNT_COLUMN = "link_account_id";
export const LINK_ACCOUNT_FOREIGN_KEY = "FK_budget_entries_link_account";
export const ACCOUNTS_OWNER_KEY_INDEX = "UQ_accounts_id_user_id";
export const LINK_ACCOUNT_CHECK = "CHK_budget_entries_link_account";
export const LINK_ACCOUNT_UNIQUE_INDEX = "UQ_budget_entries_link_account";
/** The constraint and index from AddBudgetEntryLinkKind1795440000000, redefined here. */
export const LINK_KIND_CHECK = "CHK_budget_entries_link_kind";
export const LINK_KIND_UNIQUE = "UQ_budget_entries_user_link_kind";

/** The stored account types each kind reads, as `categorizeAccountType` groups them. */
const SAVINGS_TYPES_SQL = "('saving', 'savings', 'investment', 'investments', 'isa', 'gia')";
const DEBT_TYPES_SQL = "('credit card', 'credit_card', 'loan', 'overdraft')";

export class LinkBudgetLinesToAccounts1795490000000 implements MigrationInterface {
  name = "LinkBudgetLinesToAccounts1795490000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    // Every lock up front, in one order. Adding the foreign key takes SHARE ROW EXCLUSIVE on
    // accounts and building the unique index SHARE; one ACCESS EXCLUSIVE lock covers both, held
    // briefly (accounts is small) so no lock is upgraded part way through.
    await queryRunner.query(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);

    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "${LINK_ACCOUNT_COLUMN}" uuid`,
    );

    // Recreated on every run, so a second run ends in the same state.
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_ACCOUNT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${ACCOUNTS_OWNER_KEY_INDEX}" ON "accounts" ("id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINK_ACCOUNT_FOREIGN_KEY}"
       FOREIGN KEY ("${LINK_ACCOUNT_COLUMN}", "user_id") REFERENCES "accounts" ("id", "user_id")
       ON DELETE SET NULL ("${LINK_ACCOUNT_COLUMN}")`,
    );

    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_KIND_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINK_KIND_CHECK}" CHECK ("link_kind" IS NULL OR "link_kind" IN ('take_home', 'housing', 'savings', 'debt'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_ACCOUNT_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINK_ACCOUNT_CHECK}" CHECK ("${LINK_ACCOUNT_COLUMN}" IS NULL OR ("link_kind" IS NOT NULL AND "link_kind" IN ('savings', 'debt')))`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "${LINK_KIND_UNIQUE}"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "${LINK_KIND_UNIQUE}" ON "budget_entries" ("user_id", "link_kind") WHERE "link_kind" IN ('take_home', 'housing')`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${LINK_ACCOUNT_UNIQUE_INDEX}" ON "budget_entries" ("${LINK_ACCOUNT_COLUMN}", "user_id") WHERE "${LINK_ACCOUNT_COLUMN}" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'budget_entries' AND "column_name" = '${LINK_ACCOUNT_COLUMN}'`,
    );
    if (columns.length === 0) return;
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);

    // Each resolvable line keeps the figure it showed: the account's monthly amount at share.
    await queryRunner.query(
      `UPDATE "budget_entries" b
       SET "amount" = CASE
             WHEN a."ownership" = 'joint'
               THEN round(a."monthly_contribution" * COALESCE(a."share_percent", 50) / 100.0, 2)
             ELSE a."monthly_contribution"
           END,
           "frequency" = 'monthly',
           "ownership" = 'sole',
           "share_percent" = NULL
       FROM "accounts" a
       WHERE a."id" = b."${LINK_ACCOUNT_COLUMN}"
         AND a."user_id" = b."user_id"
         AND a."monthly_contribution" IS NOT NULL
         AND (
           (b."link_kind" = 'savings' AND lower(trim(a."type")) IN ${SAVINGS_TYPES_SQL})
           OR (b."link_kind" = 'debt' AND lower(trim(a."type")) IN ${DEBT_TYPES_SQL})
         )`,
    );
    await queryRunner.query(
      `UPDATE "budget_entries" SET "link_kind" = NULL, "${LINK_ACCOUNT_COLUMN}" = NULL WHERE "link_kind" IN ('savings', 'debt')`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "${LINK_ACCOUNT_UNIQUE_INDEX}"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "${LINK_KIND_UNIQUE}"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "${LINK_KIND_UNIQUE}" ON "budget_entries" ("user_id", "link_kind") WHERE "link_kind" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_ACCOUNT_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_KIND_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINK_KIND_CHECK}" CHECK ("link_kind" IS NULL OR "link_kind" IN ('take_home', 'housing'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_ACCOUNT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "${ACCOUNTS_OWNER_KEY_INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "${LINK_ACCOUNT_COLUMN}"`,
    );
  }
}
