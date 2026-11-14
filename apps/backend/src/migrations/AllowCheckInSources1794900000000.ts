import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// R2-5 (account-by-account check-in). Additive only: allow two more `account_details.source`
// values, so history can tell a confirmed month ("No change", `confirmed`) and a calculated loan
// balance (`calculated`) from a typed figure (`manual`). No data is rewritten.
// down() relabels both as 'manual' first (their values are kept), so the old CHECK can always be
// restored.
const SOURCE_CHECK = "CHK_account_details_source";
const OLD = "'onboarding', 'manual', 'connected', 'backfill', 'agent'";
const NEW = `${OLD}, 'confirmed', 'calculated'`;

export class AllowCheckInSources1794900000000 implements MigrationInterface {
  name = "AllowCheckInSources1794900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${SOURCE_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${SOURCE_CHECK}" CHECK ("source" IN (${NEW}))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `UPDATE "account_details" SET "source" = 'manual' WHERE "source" IN ('confirmed', 'calculated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${SOURCE_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${SOURCE_CHECK}" CHECK ("source" IN (${OLD}))`,
    );
  }
}
