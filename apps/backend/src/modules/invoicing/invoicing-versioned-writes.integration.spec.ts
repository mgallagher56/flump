import "reflect-metadata";
import { PreconditionFailedException } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Invoice } from "../../entities/invoice.entity";
import { InvoicingSettings } from "../../entities/invoicing-settings.entity";
import { WorkLogEntry } from "../../entities/work-log-entry.entity";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { InvoicingService } from "./invoicing.service";

// Versioned invoicing writes (If-Match) against real Postgres. The web app sends the ETag on
// every edit, issue, paid, void and sync, and the version claim builds raw SQL, so only a real
// database shows whether the owner column it names exists. Same throwaway-database rules as
// invoicing-races.integration.spec.ts (this suite DROPs the public schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:56330/flump_races_test \
//     bunx vitest run src/modules/invoicing/invoicing-versioned-writes.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const PERSON = ["user", "versioned", String(Date.now())].join("_");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "invoicing versioned writes (real Postgres)",
  () => {
    let ds: DataSource;
    let service: InvoicingService;
    let migrations: MigrationClass[] = [];

    beforeAll(async () => {
      migrations = await discoverMigrations();
    });

    beforeEach(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
      }) as DataSourceOptions;
      ds = new DataSource({ ...options, migrations, synchronize: false, migrationsRun: false });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
      service = new InvoicingService(
        ds.getRepository(InvoicingSettings),
        ds.getRepository(WorkLogEntry),
        ds.getRepository(Invoice),
      );
    });

    afterEach(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    /** A draft invoice for one 2-hour entry at £50, with the version the web app would hold. */
    const draft = async (): Promise<{ id: string; version: Date; entryId: string }> => {
      const { entry } = await service.createWorkLog(PERSON, {
        date: "2026-11-02",
        description: "Design review",
        hoursWorked: 2,
        hourlyRate: 50,
      } as never);
      const created = await service.createInvoice(PERSON, {
        clientName: "Client",
        issueDate: "2026-11-03",
        workLogEntryIds: [entry.id],
      } as never);
      return { id: created.invoice.id, version: created.updatedAt as Date, entryId: entry.id };
    };

    const statusOf = async (id: string): Promise<string[]> => {
      const rows: Array<{ status: string }> = await ds.query(
        "SELECT status FROM invoices WHERE id = $1",
        [id],
      );
      return rows.map((row) => row.status);
    };

    /** A version one second before the stored one, as a tab loaded before another tab saved. */
    const stale = (version: Date): Date => new Date(version.getTime() - 1000);

    it("updateSettings with the current version saves the change", async () => {
      const first = await service.updateSettings(PERSON, { businessName: "First Ltd" } as never);
      const saved = await service.updateSettings(
        PERSON,
        { businessName: "Second Ltd" } as never,
        first.updatedAt as Date,
      );
      expect(saved.settings.businessName).toBe("Second Ltd");
      await expect(
        service.updateSettings(
          PERSON,
          { businessName: "Third Ltd" } as never,
          stale(saved.updatedAt as Date),
        ),
      ).rejects.toThrow(PreconditionFailedException);
      expect((await service.getSettings(PERSON)).settings.businessName).toBe("Second Ltd");
    });

    it("updateWorkLog with the current version saves the edit; a stale one is a 412", async () => {
      const created = await service.createWorkLog(PERSON, {
        date: "2026-11-02",
        description: "Before",
        hoursWorked: 2,
        hourlyRate: 50,
      } as never);
      const edited = await service.updateWorkLog(
        PERSON,
        created.entry.id,
        { description: "After" } as never,
        created.updatedAt as Date,
      );
      expect(edited.entry.description).toBe("After");
      await expect(
        service.updateWorkLog(
          PERSON,
          created.entry.id,
          { description: "Lost" } as never,
          stale(edited.updatedAt as Date),
        ),
      ).rejects.toThrow(PreconditionFailedException);
      const rows: Array<{ description: string }> = await ds.query(
        "SELECT description FROM work_log_entries WHERE id = $1",
        [created.entry.id],
      );
      expect(rows).toEqual([{ description: "After" }]);
    });

    it("updateInvoice with the current version saves the edit; a stale one is a 412", async () => {
      const invoice = await draft();
      const edited = await service.updateInvoice(
        PERSON,
        invoice.id,
        { clientName: "Renamed Client" } as never,
        invoice.version,
      );
      expect(edited.invoice.clientName).toBe("Renamed Client");
      await expect(
        service.updateInvoice(
          PERSON,
          invoice.id,
          { clientName: "Lost" } as never,
          stale(edited.updatedAt as Date),
        ),
      ).rejects.toThrow(PreconditionFailedException);
      const rows: Array<{ client_name: string }> = await ds.query(
        "SELECT client_name FROM invoices WHERE id = $1",
        [invoice.id],
      );
      expect(rows).toEqual([{ client_name: "Renamed Client" }]);
    });

    it("issue, paid and sync each succeed with the version the previous step returned", async () => {
      const invoice = await draft();
      const issued = await service.issueInvoice(PERSON, invoice.id, invoice.version);
      expect(issued.invoice.status).toBe("issued");
      const paid = await service.markInvoicePaid(
        PERSON,
        invoice.id,
        { paidDate: "2026-11-20" } as never,
        issued.updatedAt as Date,
      );
      expect(paid.invoice.status).toBe("paid");
      expect(paid.invoice.paidDate).toBe("2026-11-20");
      const synced = await service.syncInvoiceToTax(PERSON, invoice.id, paid.updatedAt as Date);
      // One entry of 2 hours at £50: 2 × 50 = £100 of self-employed income.
      const records: Array<{ amount: string; source: string }> = await ds.query(
        "SELECT amount::text AS amount, source FROM tax_records WHERE id = $1",
        [synced.invoice.taxRecordId],
      );
      expect(records.map((r) => [Number(r.amount), r.source])).toEqual([[100, "self-employed"]]);
    });

    it("issue with a stale version is a 412 and the invoice stays a draft", async () => {
      const invoice = await draft();
      await expect(
        service.issueInvoice(PERSON, invoice.id, stale(invoice.version)),
      ).rejects.toThrow(PreconditionFailedException);
      expect(await statusOf(invoice.id)).toEqual(["draft"]);
    });

    it("paid with a stale version is a 412 and the invoice stays issued", async () => {
      const invoice = await draft();
      const issued = await service.issueInvoice(PERSON, invoice.id);
      await expect(
        service.markInvoicePaid(
          PERSON,
          invoice.id,
          { paidDate: "2026-11-20" } as never,
          stale(issued.updatedAt as Date),
        ),
      ).rejects.toThrow(PreconditionFailedException);
      expect(await statusOf(invoice.id)).toEqual(["issued"]);
    });

    it("void with the current version voids; a stale one is a 412 and changes nothing", async () => {
      const kept = await draft();
      await expect(service.voidInvoice(PERSON, kept.id, stale(kept.version))).rejects.toThrow(
        PreconditionFailedException,
      );
      expect(await statusOf(kept.id)).toEqual(["draft"]);

      const voided = await service.voidInvoice(PERSON, kept.id, kept.version);
      expect(voided.invoice.status).toBe("void");
      expect(await statusOf(kept.id)).toEqual(["void"]);
    });

    it("sync with a stale version is a 412 and creates no tax record", async () => {
      const invoice = await draft();
      await service.issueInvoice(PERSON, invoice.id);
      const paid = await service.markInvoicePaid(PERSON, invoice.id, {
        paidDate: "2026-11-20",
      } as never);
      await expect(
        service.syncInvoiceToTax(PERSON, invoice.id, stale(paid.updatedAt as Date)),
      ).rejects.toThrow(PreconditionFailedException);
      const records: Array<{ count: string }> = await ds.query(
        "SELECT count(*)::text AS count FROM tax_records",
      );
      expect(records).toEqual([{ count: "0" }]);
    });
  },
);
