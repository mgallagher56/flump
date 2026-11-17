import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// E34 Slice 2: additive joint-ownership columns on accounts so one user can mark an account,
// mortgage, debt or property as joint with a percentage share. Defaults keep every existing
// account as sole (100%).
const JOINT_DOWN_REFUSAL =
  "accounts holds joint ownership or share data; set every account back to sole at the default share before reverting";

export class AddAccountJointOwnership1795250000000 implements MigrationInterface {
  name = "AddAccountJointOwnership1795250000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ownership" varchar NOT NULL DEFAULT 'sole'`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "share_percent" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "CHK_accounts_ownership"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "CHK_accounts_ownership" CHECK ("ownership" IN ('sole', 'joint'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "CHK_accounts_share_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "CHK_accounts_share_percent" CHECK ("share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 100))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Dropping the columns would silently turn every joint account back into a sole one at 100%.
    // While any account holds a non-default ownership or share, the revert is refused unchanged.
    // Columns already gone make it a no-op. The ACCESS EXCLUSIVE lock comes before the data check,
    // so no joint account can be written between the check and the drop; lock_timeout makes it
    // fail fast rather than queue behind a writer.
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns WHERE "table_schema" = current_schema() AND "table_name" = 'accounts' AND "column_name" IN ('ownership', 'share_percent')`,
    );
    const present = new Set(columns.map((c) => c.column_name));
    if (present.size === 0) return;
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);
    const conditions = [
      ...(present.has("ownership") ? [`"ownership" <> 'sole'`] : []),
      ...(present.has("share_percent")
        ? [`("share_percent" IS NOT NULL AND "share_percent" <> 100)`]
        : []),
    ];
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "accounts" WHERE ${conditions.join(" OR ")}) AS "found"`,
    );
    if (rows[0]?.found) {
      throw new Error(JOINT_DOWN_REFUSAL);
    }
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "CHK_accounts_share_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "CHK_accounts_ownership"`,
    );
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "share_percent"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "ownership"`);
  }
}
