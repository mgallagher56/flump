import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// E34 Slice 2: additive joint-ownership columns on accounts so one user can mark an account,
// mortgage, debt or property as joint with a percentage share. Defaults keep every existing
// account as sole (100%).
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
