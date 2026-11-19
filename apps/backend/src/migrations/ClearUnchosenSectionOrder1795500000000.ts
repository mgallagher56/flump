import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * The home section cards can now be put in any order, saved in `user_profiles.dashboard_widget_order`
 * (owner request, 19 Nov 2026). Until now nothing read that column, and onboarding, the Self
 * Assessment page, settings and a column default wrote orders nobody chose (pages order, accounts
 * first). Honouring them would reorder testers' cards without asking. All stored data is tester
 * data, so the column is cleared: NULL means the default order, and from now on only the
 * dashboard's "Choose what shows here" writes it.
 *
 * Idempotent: a second run finds nothing left to clear.
 */
export const CLEAR_UNCHOSEN_SECTION_ORDER_SQL = `UPDATE "user_profiles" SET "dashboard_widget_order" = NULL WHERE "dashboard_widget_order" IS NOT NULL`;

export class ClearUnchosenSectionOrder1795500000000 implements MigrationInterface {
  name = "ClearUnchosenSectionOrder1795500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(CLEAR_UNCHOSEN_SECTION_ORDER_SQL);
  }

  /**
   * Deliberately does nothing. The cleared values were never read and never chosen by a person,
   * so there is nothing true to put back; NULL already reads as the default order.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
