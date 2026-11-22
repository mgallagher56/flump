import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// User-profile preference to show or hide partner / joint-ownership controls (default false so
// sole users see less noise; existing joint records always keep their controls visible).
export class AddPartnerMode1795620000000 implements MigrationInterface {
  name = "AddPartnerMode1795620000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "partner_mode" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "partner_mode"`);
  }
}
