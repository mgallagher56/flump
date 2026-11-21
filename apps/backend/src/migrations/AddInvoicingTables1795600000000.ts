import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * E37 Slice S1 + section 10: self-employed invoicing settings, billable work log entries,
 * and invoices (with optional VAT rate and stored VAT amount).
 */
export const INVOICING_DOWN_REFUSAL =
  "invoicing_settings, work_log_entries, or invoices has rows; export or remove them before reverting";

export class AddInvoicingTables1795600000000 implements MigrationInterface {
  name = "AddInvoicingTables1795600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoicing_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "default_hourly_rate" numeric(12,2),
        "business_name" character varying,
        "business_address" text,
        "business_email" character varying,
        "vat_number" character varying,
        "invoice_prefix" character varying NOT NULL DEFAULT 'INV-',
        "next_invoice_sequence" integer NOT NULL DEFAULT 1,
        "default_payment_terms_days" integer NOT NULL DEFAULT 30,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoicing_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_invoicing_settings_bounds" CHECK (
          ("default_hourly_rate" IS NULL OR "default_hourly_rate" >= 0)
          AND "next_invoice_sequence" >= 1
          AND "default_payment_terms_days" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invoicing_settings_user_id" ON "invoicing_settings" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "invoice_number" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'draft',
        "client_name" character varying NOT NULL,
        "client_email" character varying,
        "client_address" text,
        "issue_date" date NOT NULL,
        "due_date" date NOT NULL,
        "paid_date" date,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "vat_rate_pct" numeric(5,2),
        "vat_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "notes" text,
        "tax_record_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_tax_record_id" FOREIGN KEY ("tax_record_id")
          REFERENCES "tax_records" ("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_invoices_bounds" CHECK (
          "status" IN ('draft', 'issued', 'paid', 'void')
          AND "subtotal" >= 0
          AND ("vat_rate_pct" IS NULL OR ("vat_rate_pct" >= 0 AND "vat_rate_pct" <= 100))
          AND "vat_amount" >= 0
          AND "total" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invoices_user_number" ON "invoices" ("user_id", "invoice_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoices_user_issue_date" ON "invoices" ("user_id", "issue_date")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_log_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "date" date NOT NULL,
        "description" text NOT NULL,
        "hours_worked" numeric(10,2) NOT NULL,
        "hourly_rate" numeric(12,2) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "client_name" character varying,
        "income_source" character varying NOT NULL DEFAULT 'self-employed',
        "invoice_id" uuid,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_log_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_log_entries_invoice_id" FOREIGN KEY ("invoice_id")
          REFERENCES "invoices" ("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_work_log_entries_bounds" CHECK (
          "hours_worked" >= 0
          AND "hourly_rate" >= 0
          AND "amount" >= 0
          AND "income_source" IN ('self-employed')
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_work_log_entries_user_date" ON "work_log_entries" ("user_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_work_log_entries_user_invoice" ON "work_log_entries" ("user_id", "invoice_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const tables: Array<{ settings: boolean; entries: boolean; invoices: boolean }> =
      await queryRunner.query(
        `SELECT to_regclass('"invoicing_settings"') IS NOT NULL AS "settings",
                to_regclass('"work_log_entries"') IS NOT NULL AS "entries",
                to_regclass('"invoices"') IS NOT NULL AS "invoices"`,
      );
    const present = tables[0];
    if (present?.settings && present.entries && present.invoices) {
      await queryRunner.query("SET LOCAL lock_timeout = '10s'");
      await queryRunner.query(
        `LOCK TABLE "work_log_entries", "invoices", "invoicing_settings" IN ACCESS EXCLUSIVE MODE`,
      );
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT (
          EXISTS (SELECT 1 FROM "work_log_entries")
          OR EXISTS (SELECT 1 FROM "invoices")
          OR EXISTS (SELECT 1 FROM "invoicing_settings")
        ) AS "found"`,
      );
      if (rows[0]?.found) {
        throw new Error(INVOICING_DOWN_REFUSAL);
      }
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_log_entries_user_invoice"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_log_entries_user_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_log_entries"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_user_issue_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_invoices_user_number"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_invoicing_settings_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoicing_settings"`);
  }
}
