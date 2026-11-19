import type { MigrationInterface, QueryRunner } from "typeorm";
import { dropProfileColumn, restoreProfileColumn } from "../integrity/profile-column-drop";

/**
 * System audit slice 9 (decision 12): drops `user_profiles.has_buy_to_let`, which nothing has read or
 * written since PR 808. Values that differ from the default go to the 30-day before-image first;
 * down() re-adds the column and restores them. See integrity/profile-column-drop.ts.
 */
export class DropProfileHasBuyToLet1795540000000 implements MigrationInterface {
  name = "DropProfileHasBuyToLet1795540000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await dropProfileColumn(queryRunner, this.name);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await restoreProfileColumn(queryRunner, this.name);
  }
}
