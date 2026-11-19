import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 7, decision 6 option A (docs/audit/system-2026-11/PLAN.md): the share of a
 * rental property used for tax is the property account's own share, per property, not one share
 * on the profile for every property.
 *
 * Up: each rental Property account (`type = 'Property'`, `account_subtype = 'rental'`) held
 * solely whose user's profile `property_ownership_share` rounds to 1 to 99 is set to joint at
 * that rounded share (a share that rounds to 100 is held solely, so the account stays sole). A rental already joint keeps its own share, a home Property is untouched, and a profile
 * share of 100 (or none) changes nothing. Each account's old ownership and share, and the share
 * written, go first into the before-image table `rental_share_onto_property_backfill` (the account
 * id and those values only; the account's cascade ties each row to its owner). The table is created on the first run
 * only; a second run finds it and changes nothing, so a share the person sets afterwards is never
 * undone. Rows go with their account (ON DELETE CASCADE). The retention job prunes the table after
 * 90 days. The log line is a count only.
 *
 * Down: puts the old ownership and share back only on an account still joint at the share up()
 * wrote, so a share the person has set since is kept; then drops the table.
 */
export const RENTAL_SHARE_BACKFILL_TABLE = "rental_share_onto_property_backfill";

export class RentalShareOntoPropertyAccounts1795550100000 implements MigrationInterface {
  name = "RentalShareOntoPropertyAccounts1795550100000";

  private readonly logger = new Logger("RentalShareOntoPropertyAccounts");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${RENTAL_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length > 0) return;
    await queryRunner.query(
      `CREATE TABLE "${RENTAL_SHARE_BACKFILL_TABLE}" (
         "id" serial PRIMARY KEY,
         "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
         "old_sole_or_joint" varchar NOT NULL,
         "old_share_percent" integer,
         -- The share up() wrote, so down() restores only an account the person has not changed.
         "new_share_percent" integer NOT NULL,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${RENTAL_SHARE_BACKFILL_TABLE}_account" ON "${RENTAL_SHARE_BACKFILL_TABLE}" ("account_id")`,
    );
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    const changed: unknown[] = await queryRunner.query(
      `WITH t AS (
         SELECT a."id", a."ownership", a."share_percent",
                round(u."property_ownership_share")::int AS "profile_share"
         FROM "accounts" a
         JOIN "user_profiles" u ON u."user_id" = a."user_id"
         WHERE a."type" = 'Property' AND a."account_subtype" = 'rental' AND a."ownership" = 'sole'
           -- Rounded first: a share of 99.5 to 99.99 rounds to 100, which is held solely, so the
           -- account stays sole rather than becoming joint at 100%.
           AND round(u."property_ownership_share") BETWEEN 1 AND 99
       ),
       img AS (
         INSERT INTO "${RENTAL_SHARE_BACKFILL_TABLE}" ("account_id", "old_sole_or_joint", "old_share_percent", "new_share_percent")
         SELECT "id", "ownership", "share_percent", "profile_share" FROM t
       )
       UPDATE "accounts" a SET "ownership" = 'joint', "share_percent" = t."profile_share"
       FROM t WHERE a."id" = t."id"
       RETURNING a."id"`,
    );
    // TypeORM returns an UPDATE as [rows, rowCount]. A count only: never ids, names or amounts.
    const count = Array.isArray(changed[0]) ? Number(changed[1]) : changed.length;
    this.logger.log(`Sole rental property accounts given the profile's share: ${count}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${RENTAL_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length === 0) return;
    await queryRunner.query(`LOCK TABLE "accounts" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      // Only where the account still holds what up() wrote: a share the person set since is kept.
      `UPDATE "accounts" a SET "ownership" = r."old_sole_or_joint", "share_percent" = r."old_share_percent"
       FROM "${RENTAL_SHARE_BACKFILL_TABLE}" r
       WHERE r."account_id" = a."id" AND a."ownership" = 'joint'
         AND a."share_percent" = r."new_share_percent"`,
    );
    await queryRunner.query(`DROP TABLE "${RENTAL_SHARE_BACKFILL_TABLE}"`);
  }
}
