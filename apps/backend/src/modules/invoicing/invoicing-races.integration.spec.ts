import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import {
  DataSource,
  type DataSourceOptions,
  FindOperator,
  type QueryRunner,
  Repository,
} from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Invoice } from "../../entities/invoice.entity";
import { InvoicingSettings } from "../../entities/invoicing-settings.entity";
import { WorkLogEntry } from "../../entities/work-log-entry.entity";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { InvoicingService } from "./invoicing.service";

// Invoicing races (audit follow-up, 22 November 2026). Real Postgres only: row locks and
// deadlocks cannot be modelled in memory. Same throwaway-database rules as
// migrations.integration.spec.ts (this suite DROPs the public schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:56330/flump_races_test \
//     bunx vitest run src/modules/invoicing/invoicing-races.integration.spec.ts
//
// Each test lines two requests up behind a third connection that holds the contested rows
// locked, waits until both requests are blocked, then lets go, so the interleaving is the same
// on every run instead of depending on timing.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const PERSON = ["user", "races", String(Date.now())].join("_");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "invoicing races (real Postgres)",
  () => {
    let ds: DataSource;
    // Every SQL statement the app sends, so a test can check the lock order Postgres is asked for.
    const queries: string[] = [];
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
      queries.length = 0;
      const record = (query: string) => {
        queries.push(query);
      };
      const ignore = () => undefined;
      ds = new DataSource({
        ...options,
        migrations,
        synchronize: false,
        migrationsRun: false,
        logging: ["query"],
        logger: {
          logQuery: record,
          logQueryError: ignore,
          logQuerySlow: ignore,
          logSchemaBuild: ignore,
          logMigration: ignore,
          log: ignore,
        },
      });
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
      vi.restoreAllMocks();
      if (ds?.isInitialized) await ds.destroy();
    });

    const workLog = async (description: string): Promise<string> => {
      const { entry } = await service.createWorkLog(PERSON, {
        date: "2026-11-02",
        description,
        hoursWorked: 2,
        hourlyRate: 50,
      } as never);
      return entry.id;
    };

    const invoiceFor = async (entryIds: string[], clientName = "Client"): Promise<string> => {
      const { invoice } = await service.createInvoice(PERSON, {
        clientName,
        issueDate: "2026-11-03",
        workLogEntryIds: entryIds,
      } as never);
      return invoice.id;
    };

    /** Opens a transaction on its own connection that holds these work-log rows locked. */
    const holdRows = async (ids: string[]): Promise<QueryRunner> => {
      const runner = ds.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      await runner.query(`SELECT id FROM work_log_entries WHERE id = ANY($1) FOR UPDATE`, [ids]);
      return runner;
    };

    const release = async (runner: QueryRunner): Promise<void> => {
      await runner.commitTransaction();
      await runner.release();
    };

    /** Waits (up to 5s) until `count` other sessions are blocked on a lock. */
    const waitForBlocked = async (count: number): Promise<void> => {
      const deadline = Date.now() + 5000;
      for (;;) {
        const [row]: Array<{ n: number }> = await ds.query(
          `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'`,
        );
        if ((row?.n ?? 0) >= count) return;
        if (Date.now() > deadline)
          throw new Error(`only ${row?.n ?? 0} of ${count} requests blocked`);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    };

    const linkedTo = async (ids: string[]): Promise<Array<string | null>> => {
      const rows: Array<{ invoice_id: string | null }> = await ds.query(
        `SELECT invoice_id FROM work_log_entries WHERE id = ANY($1) ORDER BY id`,
        [ids],
      );
      return rows.map((r) => r.invoice_id);
    };

    /** One request won and the other was refused with a 409, not a 500. */
    const oneWonOneRefused = <T>(results: PromiseSettledResult<T>[]): T => {
      const won = results.filter((r): r is PromiseFulfilledResult<T> => r.status === "fulfilled");
      const lost = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(lost.map((r) => (r.reason as Error).constructor.name)).toEqual(["ConflictException"]);
      expect(lost[0]?.reason).toBeInstanceOf(ConflictException);
      expect(won).toHaveLength(1);
      return (won[0] as PromiseFulfilledResult<T>).value;
    };

    it("two draft invoices taking the same free entries in opposite row orders: one wins, the other gets a 409, no deadlock", async () => {
      const [ownA, ownB, e1, e2] = [
        await workLog("A's own"),
        await workLog("B's own"),
        await workLog("free one"),
        await workLog("free two"),
      ];
      const invoiceA = await invoiceFor([ownA as string], "Client A");
      const invoiceB = await invoiceFor([ownB as string], "Client B");

      // Postgres promises no row order without ORDER BY. Return the second unordered read of the
      // requested entries reversed, as another plan could, so the two requests meet the rows in
      // opposite orders.
      const find = Repository.prototype.find;
      let unorderedReads = 0;
      vi.spyOn(Repository.prototype, "find").mockImplementation(async function (
        this: Repository<WorkLogEntry>,
        options,
      ) {
        const rows = await find.call(this, options);
        const where = options?.where as Record<string, unknown> | undefined;
        const unordered = where?.id instanceof FindOperator && !options?.lock && !options?.order;
        if (this.metadata.target === WorkLogEntry && unordered && ++unorderedReads === 2) {
          return [...rows].reverse();
        }
        return rows;
      });

      const holder = await holdRows([e1 as string, e2 as string]);
      const requests = [
        service.updateInvoice(PERSON, invoiceA, { workLogEntryIds: [ownA, e1, e2] } as never),
        service.updateInvoice(PERSON, invoiceB, { workLogEntryIds: [ownB, e1, e2] } as never),
      ];
      await waitForBlocked(2);
      await release(holder);
      const winner = oneWonOneRefused(await Promise.allSettled(requests));

      const winnerId = winner.invoice.id;
      const loserId = winnerId === invoiceA ? invoiceB : invoiceA;
      const loserOwn = winnerId === invoiceA ? ownB : ownA;
      expect(await linkedTo([e1 as string, e2 as string])).toEqual([winnerId, winnerId]);
      // The guard itself: Postgres takes a statement's row locks in its output order, so every
      // locking read of work-log rows must sort by id before FOR UPDATE. Without the sort, two
      // requests can lock the same rows in different orders whatever the JavaScript order is.
      const lockingReads = queries.filter(
        (q) => /FROM "work_log_entries"/.test(q) && /FOR UPDATE/.test(q),
      );
      expect(lockingReads.length).toBeGreaterThanOrEqual(2);
      for (const q of lockingReads) {
        expect(q).toMatch(/ORDER BY "\w+"\."id" ASC\s+FOR UPDATE$/);
      }
      expect(winner.invoice.entries.map((e) => e.id).sort()).toEqual(
        [winnerId === invoiceA ? ownA : ownB, e1, e2].sort(),
      );
      // The refused invoice is unchanged: its own entry only, and its total is that entry's.
      const loser = await service.getInvoice(PERSON, loserId);
      expect(loser.invoice.entries.map((e) => e.id)).toEqual([loserOwn]);
      // 2 hours at £50 an hour = £100.
      expect(loser.invoice.total).toBe(100);
    });

    it("two createInvoice calls for the same entry, before any settings row exists: one invoice, the other gets a 409", async () => {
      const e1 = await workLog("contested");
      const holder = await holdRows([e1]);
      const requests = [invoiceFor([e1], "First"), invoiceFor([e1], "Second")];
      await waitForBlocked(2);
      await release(holder);
      const winnerId = oneWonOneRefused(await Promise.allSettled(requests));

      expect(await linkedTo([e1])).toEqual([winnerId]);
      const invoices: Array<{ id: string; invoice_number: string }> = await ds.query(
        "SELECT id, invoice_number FROM invoices",
      );
      expect(invoices).toEqual([{ id: winnerId, invoice_number: "INV-0001" }]);
      const settings: Array<{ next_invoice_sequence: number }> = await ds.query(
        "SELECT next_invoice_sequence FROM invoicing_settings WHERE user_id = $1",
        [PERSON],
      );
      expect(settings).toEqual([{ next_invoice_sequence: 2 }]);
    });

    it("createInvoice and a draft's update claiming the same entry: one claim, the other gets a 409", async () => {
      const ownB = await workLog("B's own");
      const invoiceB = await invoiceFor([ownB], "Client B");
      const e1 = await workLog("contested");

      const holder = await holdRows([e1]);
      const requests: Array<Promise<string>> = [
        invoiceFor([e1], "New"),
        service
          .updateInvoice(PERSON, invoiceB, { workLogEntryIds: [ownB, e1] } as never)
          .then((view) => view.invoice.id),
      ];
      await waitForBlocked(2);
      await release(holder);
      const winnerId = oneWonOneRefused(await Promise.allSettled(requests));

      expect(await linkedTo([e1])).toEqual([winnerId]);
      // Every stored invoice's subtotal is the sum of the entries linked to it, so no invoice
      // bills an entry another invoice holds. Each entry is 2 hours at £50 = £100.
      const totals: Array<{ subtotal: string; linked: string }> = await ds.query(
        `SELECT i.subtotal::text AS subtotal, coalesce(sum(w.amount), 0)::text AS linked
         FROM invoices i LEFT JOIN work_log_entries w ON w.invoice_id = i.id
        GROUP BY i.id ORDER BY i.invoice_number`,
      );
      expect(totals.map((t) => Number(t.subtotal))).toEqual(totals.map((t) => Number(t.linked)));
      expect(totals.map((t) => Number(t.subtotal)).sort()).toEqual(
        winnerId === invoiceB ? [200] : [100, 100],
      );
    });
  },
);
