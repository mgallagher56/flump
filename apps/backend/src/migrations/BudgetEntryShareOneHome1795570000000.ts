import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * E34 C1, one home per value for the share on budget lines. A line linked to take-home pay, a
 * savings account or a debt stores no share of its own: take-home pay is the person's own, and a
 * savings or debt line reads its account's monthly amount already at the account's share. A line
 * linked to housing keeps its share (it is the home of a shared rent's share, audit JO-8), and so
 * does an unlinked line. A joint line's share is 1 to 99: 100 means it is all the person's, which
 * is sole.
 *
 * Up: each line that breaks those rules is set to sole with no share: a take-home, savings or
 * debt line that is joint or holds a share, a joint line at 100, and a sole line that holds a
 * share. Each line's old ownership and share go first into the before-image table
 * `budget_entry_share_backfill` (the budget line id and those values only; the line's cascade
 * ties each row to its owner). Then the share check narrows to 1 to 99, and two new checks keep a
 * sole line and a take-home, savings or debt line from holding a share. The table is created on
 * the first run only; a second run finds it and changes nothing, so a share the person sets
 * afterwards is never undone. Rows go with their budget line (ON DELETE CASCADE). The retention
 * job prunes the table after 90 days. The log line is a count only.
 *
 * Down: drops the two new checks and restores the 1 to 100 check, puts the old ownership and share
 * back only on a line still sole with no share (what up() wrote), so a share the person has set
 * since is kept; then drops the table.
 */
export const BUDGET_ENTRY_SHARE_BACKFILL_TABLE = "budget_entry_share_backfill";

export class BudgetEntryShareOneHome1795570000000 implements MigrationInterface {
  name = "BudgetEntryShareOneHome1795570000000";

  private readonly logger = new Logger("BudgetEntryShareOneHome");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length > 0) return;
    await queryRunner.query(
      `CREATE TABLE "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}" (
         "id" serial PRIMARY KEY,
         "budget_entry_id" uuid NOT NULL REFERENCES "budget_entries"("id") ON DELETE CASCADE,
         "old_sole_or_joint" varchar NOT NULL,
         "old_share_percent" integer,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}_entry" ON "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}" ("budget_entry_id")`,
    );
    // ACCESS EXCLUSIVE up front: the ADD CONSTRAINT calls below need it, and taking a weaker lock
    // first could deadlock with a reader that later writes.
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    const changed: unknown[] = await queryRunner.query(
      `WITH t AS (
         SELECT b."id", b."ownership", b."share_percent"
         FROM "budget_entries" b
         WHERE (b."link_kind" IN ('take_home', 'savings', 'debt')
                AND (b."ownership" <> 'sole' OR b."share_percent" IS NOT NULL))
            OR (b."ownership" = 'joint' AND b."share_percent" = 100)
            OR (b."ownership" = 'sole' AND b."share_percent" IS NOT NULL)
       ),
       img AS (
         INSERT INTO "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}" ("budget_entry_id", "old_sole_or_joint", "old_share_percent")
         SELECT "id", "ownership", "share_percent" FROM t
       )
       UPDATE "budget_entries" b SET "ownership" = 'sole', "share_percent" = NULL
       FROM t WHERE b."id" = t."id"
       RETURNING b."id"`,
    );
    // TypeORM returns an UPDATE as [rows, rowCount]. A count only: never ids, names or amounts.
    const count = Array.isArray(changed[0]) ? Number(changed[1]) : changed.length;
    this.logger.log(`Budget lines set to sole with no share: ${count}`);

    // Dropped first if present: a synchronize-built database already has them from the entity.
    for (const name of [
      "CHK_budget_entries_share_percent",
      "CHK_budget_entries_sole_no_share",
      "CHK_budget_entries_linked_no_share",
    ]) {
      await queryRunner.query(`ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${name}"`);
    }
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_share_percent" CHECK ("share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 99))`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_sole_no_share" CHECK ("ownership" = 'joint' OR "share_percent" IS NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_linked_no_share" CHECK ("link_kind" IS NULL OR "link_kind" = 'housing' OR ("ownership" = 'sole' AND "share_percent" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const existing: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE "table_schema" = current_schema() AND "table_name" = '${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}'`,
    );
    if (existing.length === 0) return;
    await queryRunner.query(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_linked_no_share"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_sole_no_share"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "CHK_budget_entries_share_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_entries" ADD CONSTRAINT "CHK_budget_entries_share_percent" CHECK ("share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 100))`,
    );
    await queryRunner.query(
      // Only where the line still holds what up() wrote: a share the person set since is kept.
      `UPDATE "budget_entries" b SET "ownership" = r."old_sole_or_joint", "share_percent" = r."old_share_percent"
       FROM "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}" r
       WHERE r."budget_entry_id" = b."id" AND b."ownership" = 'sole' AND b."share_percent" IS NULL`,
    );
    await queryRunner.query(`DROP TABLE "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}"`);
  }
}
