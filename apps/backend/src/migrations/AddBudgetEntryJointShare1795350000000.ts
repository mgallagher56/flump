import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// E34 slice C1: additive joint-ownership columns on budget_entries, mirroring accounts
// (AddAccountJointOwnership1795250000000), so one user can mark a budget entry as joint with a
// percentage share. Defaults keep every existing entry as sole (100%), so no figure changes.
export const BUDGET_JOINT_DOWN_REFUSAL =
  "budget_entries holds joint ownership or share data; set every budget entry back to sole before reverting";

export class AddBudgetEntryJointShare1795350000000 implements MigrationInterface {
  name = "AddBudgetEntryJointShare1795350000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "ownership" varchar NOT NULL DEFAULT 'sole'`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "share_percent" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_ownership"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_ownership" CHECK ("ownership" IN ('sole', 'joint'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_share_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_share_percent" CHECK ("share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 100))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Dropping the columns would silently count every joint entry in full again. While any entry
    // is joint or holds a share, the revert is refused unchanged. Columns already gone make it a
    // no-op. The ACCESS EXCLUSIVE lock comes before the data check, so no joint entry can be
    // written between the check and the drop; lock_timeout makes it fail fast.
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'budget_entries' AND "column_name" IN ('ownership', 'share_percent')`,
    );
    const present = new Set(columns.map((c) => c.column_name));
    if (present.size === 0) return;
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    const conditions = [
      ...(present.has("ownership") ? [`"ownership" <> 'sole'`] : []),
      ...(present.has("share_percent") ? [`"share_percent" IS NOT NULL`] : []),
    ];
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "budget_entries" WHERE ${conditions.join(" OR ")}) AS "found"`,
    );
    if (rows[0]?.found) {
      throw new Error(BUDGET_JOINT_DOWN_REFUSAL);
    }
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_share_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_ownership"`,
    );
    await queryRunner.query(`ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "share_percent"`);
    await queryRunner.query(`ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "ownership"`);
  }
}
