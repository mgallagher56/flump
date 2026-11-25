import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * "Sync to Self Assessment" on a paid invoice wrote its tax record with the category
 * "Freelance / Invoice", which the finance engine does not list, so the Self Assessment estimate
 * left that income out. The writer now uses `self_employed_income`; this moves the records it
 * wrote before.
 *
 * Up: only a tax record an invoice points at (`invoices.tax_record_id`, same owner) with source
 * `self-employed` and category "Freelance / Invoice" changes, to `self_employed_income`. A record
 * typed by hand with the same name or category and no invoice link is left alone. Each changed
 * record's id goes first into the before-image table `invoice_tax_record_category_backfill` (the
 * id only; the record's cascade ties each row to its owner), so down() can tell these apart from
 * records synced after the writer fix. The table is created on the first run only; a second run
 * finds it and changes nothing. Rows go with their tax record (ON DELETE CASCADE). The retention
 * job prunes the table after 90 days. The log line is a count only.
 *
 * Down: puts "Freelance / Invoice" back on exactly the records up() changed, where they still
 * hold `self_employed_income`, then drops the table.
 *
 * The category ids are literals: migrations load where the engine is not built, and a historic
 * migration must change the same rows whenever it runs.
 */
export const INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE = "invoice_tax_record_category_backfill";
export const OLD_INVOICE_TAX_CATEGORY = "Freelance / Invoice";
export const NEW_INVOICE_TAX_CATEGORY = "self_employed_income";

export class InvoiceTaxRecordCategory1795640000000 implements MigrationInterface {
  name = "InvoiceTaxRecordCategory1795640000000";

  private readonly logger = new Logger("InvoiceTaxRecordCategory");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}`,
    ]);
    if (ran === true) {
      this.logger.log("skipped: already ran once");
      return;
    }
    await queryRunner.query(
      `CREATE TABLE "${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}" (
         "id" bigserial PRIMARY KEY,
         "tax_record_id" uuid NOT NULL REFERENCES "tax_records"("id") ON DELETE CASCADE,
         "backfilled_at" timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}_record" ON "${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}" ("tax_record_id")`,
    );
    // Blocks writes (never reads) until commit, so no sync or edit lands between image and update.
    await queryRunner.query(`LOCK TABLE "tax_records", "invoices" IN SHARE ROW EXCLUSIVE MODE`);
    const [{ changed }] = await queryRunner.query(
      `WITH t AS (
         SELECT DISTINCT r."id"
         FROM "tax_records" r
         JOIN "invoices" i ON i."tax_record_id" = r."id" AND i."user_id" = r."user_id"
         WHERE r."source" = 'self-employed' AND r."category" = $1
       ), image AS (
         INSERT INTO "${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}" ("tax_record_id")
         SELECT "id" FROM t
       ), changed AS (
         UPDATE "tax_records" r SET "category" = $2
         FROM t WHERE r."id" = t."id"
         RETURNING 1
       )
       SELECT count(*)::int AS changed FROM changed`,
      [OLD_INVOICE_TAX_CATEGORY, NEW_INVOICE_TAX_CATEGORY],
    );
    this.logger.log(`Invoice tax records moved to self-employed income: ${changed}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ ran }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS ran", [
      `public.${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}`,
    ]);
    if (ran !== true) return;
    await queryRunner.query(
      // Only the records up() changed, and only while they still hold what it wrote.
      `UPDATE "tax_records" r SET "category" = $1
       FROM "${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}" b
       WHERE b."tax_record_id" = r."id" AND r."source" = 'self-employed' AND r."category" = $2`,
      [OLD_INVOICE_TAX_CATEGORY, NEW_INVOICE_TAX_CATEGORY],
    );
    await queryRunner.query(`DROP TABLE "${INVOICE_TAX_RECORD_CATEGORY_BACKFILL_TABLE}"`);
  }
}
