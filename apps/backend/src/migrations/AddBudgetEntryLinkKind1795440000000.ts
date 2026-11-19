import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Owner items 7 and 33b, review of PR 783, and system audit decision 1 option A (linked lines,
 * docs/audit/system-2026-11/PLAN.md slice 5): a budget line the person chose to link to a saved
 * fact ("Use your take-home pay of £X", "Use your saved rent of £X"). `link_kind` names the fact,
 * `take_home` or `housing`; slice 5 adds further kinds (and `link_account_id`) to the same CHECK.
 * A linked line's stored amount is never read: the profile holds the only stored value and the
 * engine resolves the line when the budget is read. Nullable with no default, so adding it is
 * metadata-only and every existing row reads as not linked: no figure changes.
 */
export const LINK_KIND_CONSTRAINT = "CHK_budget_entries_link_kind";
/** One line per user per fact: the engine resolves one line per kind. */
export const LINK_KIND_UNIQUE_INDEX = "UQ_budget_entries_user_link_kind";
export const LINK_KIND_DOWN_REFUSAL =
  "budget_entries holds lines linked to a saved fact; unlink them before reverting, or their amounts read as £0";

export class AddBudgetEntryLinkKind1795440000000 implements MigrationInterface {
  name = "AddBudgetEntryLinkKind1795440000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "link_kind" varchar(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_KIND_CONSTRAINT}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINK_KIND_CONSTRAINT}" CHECK ("link_kind" IS NULL OR "link_kind" IN ('take_home', 'housing'))`,
    );
    // Partial, so unlinked rows are not indexed. The column is new, so no existing row can clash.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${LINK_KIND_UNIQUE_INDEX}" ON "budget_entries" ("user_id", "link_kind") WHERE "link_kind" IS NOT NULL`,
    );
  }

  /**
   * Refused while any line is linked: dropping the column would leave those lines at the £0
   * stored on them, silently taking the pay or housing payment out of the budget.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'budget_entries' AND "column_name" = 'link_kind'`,
    );
    if (columns.length === 0) return;
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "budget_entries" WHERE "link_kind" IS NOT NULL) AS "found"`,
    );
    if (rows[0]?.found) throw new Error(LINK_KIND_DOWN_REFUSAL);
    await queryRunner.query(`DROP INDEX IF EXISTS "${LINK_KIND_UNIQUE_INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_KIND_CONSTRAINT}"`,
    );
    await queryRunner.query(`ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "link_kind"`);
  }
}
