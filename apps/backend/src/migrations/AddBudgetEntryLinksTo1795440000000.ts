import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Owner items 7 and 33b, review of PR 783: a budget row the person chose to replace with a saved
 * detail ("Use your take-home pay of £X", "Use your saved rent of £X"). `links_to` names the
 * detail, "take-home" or "housing"; the row's own amount is set to 0 when it is chosen, so the
 * profile holds the one stored value and the engine reads it in the row's place. Nullable with no
 * default, so adding it is metadata-only and every existing row reads as not linked: no figure
 * changes.
 */
export const LINKS_TO_CONSTRAINT = "CHK_budget_entries_links_to";
export const LINKS_TO_DOWN_REFUSAL =
  "budget_entries holds rows linked to a saved detail; unlink them before reverting, or their amounts read as £0";

export class AddBudgetEntryLinksTo1795440000000 implements MigrationInterface {
  name = "AddBudgetEntryLinksTo1795440000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "links_to" varchar(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINKS_TO_CONSTRAINT}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "${LINKS_TO_CONSTRAINT}" CHECK ("links_to" IS NULL OR "links_to" IN ('take-home', 'housing'))`,
    );
  }

  /**
   * Refused while any row is linked: dropping the column would leave those rows at the £0 they
   * were set to, silently taking the pay or housing payment out of the budget.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'budget_entries' AND "column_name" = 'links_to'`,
    );
    if (columns.length === 0) return;
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "budget_entries" WHERE "links_to" IS NOT NULL) AS "found"`,
    );
    if (rows[0]?.found) throw new Error(LINKS_TO_DOWN_REFUSAL);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINKS_TO_CONSTRAINT}"`,
    );
    await queryRunner.query(`ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "links_to"`);
  }
}
