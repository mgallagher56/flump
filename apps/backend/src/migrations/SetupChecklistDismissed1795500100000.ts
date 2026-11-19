import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 8, decision 13 option A (docs/audit/system-2026-11/PLAN.md): "setup checklist
 * dismissed" is stored on the profile, not in the browser, so it follows the person to every
 * device, a reset clears it, and the server's first paint matches the page after it loads.
 *
 * Up: `user_profiles.setup_checklist_dismissed boolean NOT NULL DEFAULT false`. A constant default
 * makes the add metadata-only (no table rewrite). Every existing profile reads false: the old flag
 * lived only in a browser, which the database cannot read, so a person who dismissed it sees the
 * checklist once more and can dismiss it again. No stored value changes, so nothing is logged.
 *
 * Down: drops the column. Nothing else reads it.
 */
export const SETUP_CHECKLIST_DISMISSED_COLUMN = "setup_checklist_dismissed";

export class SetupChecklistDismissed1795500100000 implements MigrationInterface {
  name = "SetupChecklistDismissed1795500100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "user_profiles" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "${SETUP_CHECKLIST_DISMISSED_COLUMN}" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`LOCK TABLE "user_profiles" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "${SETUP_CHECKLIST_DISMISSED_COLUMN}"`,
    );
  }
}
