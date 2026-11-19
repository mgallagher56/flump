import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 5, the housing line (JO-8): the saved rent is now the whole rent, and the
 * budget's linked rent line carries the person's share. Before, the saved rent was asked for as
 * the person's own share and a linked housing line's ownership and share were never read. So a
 * renter's housing line that is linked and already joint would now take its share a second time:
 * £600 saved (their half) on a joint 50% line would read £300.
 *
 * Up: each such line (`link_kind = 'housing'`, joint, its user renting) is set to sole, so it reads
 * the saved figure as it did. Its old ownership and share go first into the before-image table
 * `rent_share_backfill`. A typed housing row keeps its share (it always counted), and so does a
 * mortgage holder's line (a mortgage's share is on the account, never the line). The table is
 * created on the first run only; a second run finds it and changes nothing, so a share the person
 * sets afterwards is never undone. Rows go with their budget line (ON DELETE CASCADE). The
 * retention job prunes the table after 90 days.
 *
 * Down: puts each recorded line's ownership and share back, then drops the table.
 */
export const RENT_SHARE_BACKFILL_TABLE = "rent_share_backfill";

export class RentLinesWholeRent1795490100000 implements MigrationInterface {
  name = "RentLinesWholeRent1795490100000";

  private readonly logger = new Logger("RentLinesWholeRent");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${RENT_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length > 0) return;
    await queryRunner.query(
      `CREATE TABLE "${RENT_SHARE_BACKFILL_TABLE}" (
         "id" serial PRIMARY KEY,
         "budget_entry_id" uuid NOT NULL REFERENCES "budget_entries"("id") ON DELETE CASCADE,
         "old_sole_or_joint" varchar NOT NULL,
         "old_share_percent" smallint,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${RENT_SHARE_BACKFILL_TABLE}_entry" ON "${RENT_SHARE_BACKFILL_TABLE}" ("budget_entry_id")`,
    );
    await queryRunner.query(`LOCK TABLE "budget_entries" IN SHARE ROW EXCLUSIVE MODE`);
    const changed: unknown[] = await queryRunner.query(
      `WITH t AS (
         SELECT b."id", b."ownership", b."share_percent"
         FROM "budget_entries" b
         JOIN "user_profiles" u ON u."user_id" = b."user_id"
         WHERE b."link_kind" = 'housing' AND b."ownership" = 'joint' AND u."housing_status" = 'renting'
       ),
       img AS (
         INSERT INTO "${RENT_SHARE_BACKFILL_TABLE}" ("budget_entry_id", "old_sole_or_joint", "old_share_percent")
         SELECT "id", "ownership", "share_percent" FROM t
       )
       UPDATE "budget_entries" b SET "ownership" = 'sole', "share_percent" = NULL
       FROM t WHERE b."id" = t."id"
       RETURNING b."id"`,
    );
    // TypeORM returns an UPDATE as [rows, rowCount]. A count only: never ids, names or amounts.
    const count = Array.isArray(changed[0]) ? Number(changed[1]) : changed.length;
    this.logger.log(`Renters' joint linked rent lines set to sole: ${count}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${RENT_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length === 0) return;
    await queryRunner.query(`LOCK TABLE "budget_entries" IN SHARE ROW EXCLUSIVE MODE`);
    await queryRunner.query(
      `UPDATE "budget_entries" b SET "ownership" = r."old_sole_or_joint", "share_percent" = r."old_share_percent"
       FROM "${RENT_SHARE_BACKFILL_TABLE}" r WHERE r."budget_entry_id" = b."id"`,
    );
    await queryRunner.query(`DROP TABLE "${RENT_SHARE_BACKFILL_TABLE}"`);
  }
}
