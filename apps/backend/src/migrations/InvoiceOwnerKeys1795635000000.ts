import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Audit follow-up (22 November 2026): the invoicing keys name a row by id only, so nothing in the
 * database stopped an invoice pointing at another user's tax record, or a work-log entry at another
 * user's invoice. The service always filters on the caller's id; this puts the same rule in the
 * database, as account_details and tax_records.account_id already have.
 *
 * Up:
 *   1. Counts the invoices whose tax record is another user's, and the work-log entries whose
 *      invoice is another user's, and logs the counts only.
 *   2. Unique indexes on tax_records (id, user_id) and invoices (id, user_id) for the keys to
 *      reference. `id` is each table's primary key, so every existing row already satisfies them.
 *   3. Owner keys on invoices (tax_record_id, user_id) and work_log_entries (invoice_id, user_id).
 *      Deleting the tax record or invoice sets only the link column to null
 *      (`ON DELETE SET NULL (column)`, Postgres 15 and later; the project runs 18), as the old keys
 *      did: plain SET NULL would also null user_id, which is NOT NULL. Each key is added NOT VALID,
 *      so no row is read while the tables are locked, then validated when its count was 0.
 *   4. A validated owner key covers everything the old id-only key checked, so the old key is
 *      dropped. When a count is not 0 the new key stays NOT VALID, the old key stays, and no row
 *      changes: new and changed rows are checked from now on, and the old rows wait for an owner
 *      decision (stored data is never rewritten without one). The log says so.
 *
 * No row is changed or removed in either direction. Re-running ends in the same state.
 *
 * Down puts back the two id-only keys (every stored link still names an existing row, as the owner
 * keys or the kept old keys guaranteed), then drops the owner keys and the two unique indexes.
 */
export const INVOICE_TAX_RECORD_OWNER_KEY = "FK_invoices_tax_record_owner";
export const WORK_LOG_INVOICE_OWNER_KEY = "FK_work_log_entries_invoice_owner";
export const INVOICE_TAX_RECORD_KEY = "FK_invoices_tax_record_id";
export const WORK_LOG_INVOICE_KEY = "FK_work_log_entries_invoice_id";
export const TAX_RECORDS_OWNER_INDEX = "UQ_tax_records_id_user_id";
export const INVOICES_OWNER_INDEX = "UQ_invoices_id_user_id";

interface OwnerKey {
  table: string;
  column: string;
  referenced: string;
  ownerKey: string;
  oldKey: string;
  label: string;
}

const KEYS: OwnerKey[] = [
  {
    table: "invoices",
    column: "tax_record_id",
    referenced: "tax_records",
    ownerKey: INVOICE_TAX_RECORD_OWNER_KEY,
    oldKey: INVOICE_TAX_RECORD_KEY,
    label: "Invoices whose tax record is another user's",
  },
  {
    table: "work_log_entries",
    column: "invoice_id",
    referenced: "invoices",
    ownerKey: WORK_LOG_INVOICE_OWNER_KEY,
    oldKey: WORK_LOG_INVOICE_KEY,
    label: "Work log entries whose invoice is another user's",
  },
];

export class InvoiceOwnerKeys1795635000000 implements MigrationInterface {
  name = "InvoiceOwnerKeys1795635000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const log = new Logger(this.name);
    // Every lock up front, referenced tables first, at the strength dropping a key needs, so none
    // is upgraded part way and no row changes between the counts and the keys. The invoicing
    // tables are small and the locks brief; a migration that times out is retried by the next boot.
    for (const table of ["tax_records", "invoices", "work_log_entries"]) {
      await queryRunner.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`);
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${TAX_RECORDS_OWNER_INDEX}" ON "tax_records" ("id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${INVOICES_OWNER_INDEX}" ON "invoices" ("id", "user_id")`,
    );

    for (const key of KEYS) {
      const [row]: Array<{ n: number }> = await queryRunner.query(
        `SELECT count(*)::int AS n
           FROM "${key.table}" c
           JOIN "${key.referenced}" p ON p."id" = c."${key.column}"
          WHERE p."user_id" <> c."user_id"`,
      );
      const mismatched = row?.n ?? 0;
      // A count only: never ids, names or amounts.
      log.log(`${key.label}: ${mismatched}`);

      await queryRunner.query(
        `ALTER TABLE "${key.table}" DROP CONSTRAINT IF EXISTS "${key.ownerKey}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${key.table}" ADD CONSTRAINT "${key.ownerKey}"
         FOREIGN KEY ("${key.column}", "user_id") REFERENCES "${key.referenced}" ("id", "user_id")
         ON DELETE SET NULL ("${key.column}") NOT VALID`,
      );
      if (mismatched === 0) {
        await queryRunner.query(`ALTER TABLE "${key.table}" VALIDATE CONSTRAINT "${key.ownerKey}"`);
        await queryRunner.query(
          `ALTER TABLE "${key.table}" DROP CONSTRAINT IF EXISTS "${key.oldKey}"`,
        );
      } else {
        log.warn(
          `${key.ownerKey} left NOT VALID and ${key.oldKey} kept: new and changed rows are checked, existing rows are unchanged`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    for (const table of ["tax_records", "invoices", "work_log_entries"]) {
      await queryRunner.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`);
    }
    for (const key of KEYS) {
      const kept: unknown[] = await queryRunner.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass`,
        [key.oldKey, key.table],
      );
      if (kept.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "${key.table}" ADD CONSTRAINT "${key.oldKey}" FOREIGN KEY ("${key.column}")
           REFERENCES "${key.referenced}" ("id") ON DELETE SET NULL`,
        );
      }
      await queryRunner.query(
        `ALTER TABLE "${key.table}" DROP CONSTRAINT IF EXISTS "${key.ownerKey}"`,
      );
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "${INVOICES_OWNER_INDEX}"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "${TAX_RECORDS_OWNER_INDEX}"`);
  }
}
