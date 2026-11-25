import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * A month's check-in can now be started but not finished (CH-3, "Continue check-in"). The first
 * balance the check-in saves for a month writes a `snapshot_checkins` row with `completed_at`
 * empty; finishing the check-in fills it. No new column: the row was already the check-in record.
 *
 * `down()` removes the started rows (they mean nothing to the old schema) and restores NOT NULL.
 */
export class CheckInStartedRows1795650000000 implements MigrationInterface {
  name = "CheckInStartedRows1795650000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "snapshot_checkins" ALTER COLUMN "completed_at" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DELETE FROM "snapshot_checkins" WHERE "completed_at" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "snapshot_checkins" ALTER COLUMN "completed_at" SET NOT NULL`,
    );
  }
}
