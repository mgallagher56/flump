import type { MigrationInterface, QueryRunner } from "typeorm";
import { dropProfileColumn, restoreProfileColumn } from "../integrity/profile-column-drop";

/**
 * System audit slice 9 (decision 12): drops `user_profiles.dashboard_widget_config`, which nothing has read or
 * written since PR 808. Values that differ from the default go to the 30-day before-image first;
 * down() re-adds the column and restores them. See integrity/profile-column-drop.ts.
 */
export class DropProfileDashboardWidgetConfig1795541100000 implements MigrationInterface {
  name = "DropProfileDashboardWidgetConfig1795541100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await dropProfileColumn(queryRunner, this.name);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await restoreProfileColumn(queryRunner, this.name);
  }
}
