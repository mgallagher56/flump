import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations } from "../../testing/discoverMigrations";
import { ImportsService } from "./imports.service";

// BE-13 (audit L13): import commit creates every new account in one insert, and revert restores
// rows and current-month balances in one statement each. These pin the batched writes to the
// per-row behaviour they replaced. Real Postgres only; this suite DROPs the public schema:
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/modules/imports/imports-batched-writes.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-11-14T12:00:00Z");
const OWNER_ID = "owner-be13";

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "import commit and revert batch their writes (real Postgres)",
  { timeout: 60_000 },
  () => {
    let ds: DataSource;

    beforeEach(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
      }) as DataSourceOptions;
      ds = new DataSource({
        ...options,
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
    });

    afterEach(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    const insertAccount = async (name: string, type: string, balance: number): Promise<string> => {
      const [row] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ($1, $2, $3, $4, 'GBP') RETURNING id`,
        [OWNER_ID, name, type, balance],
      );
      return row.id;
    };

    const insertManual = async (accountId: string, month: number, value: number) => {
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, 2026, $3, $4, make_date(2026, $3, 1), 'manual')`,
        [accountId, OWNER_ID, month, value],
      );
    };

    interface HistoryRow {
      month: number;
      value: number;
      source: string;
      asOfDate: string;
      importBatchId: string | null;
    }
    const history = async (accountId: string): Promise<HistoryRow[]> =>
      ds.query(
        `SELECT month, value::float AS value, source, as_of_date::text AS "asOfDate",
                import_batch_id AS "importBatchId"
         FROM account_details WHERE account_id = $1 ORDER BY year, month`,
        [accountId],
      );

    const balanceOf = async (accountId: string): Promise<number> =>
      Number(
        (await ds.query(`SELECT balance FROM accounts WHERE id = $1`, [accountId]))[0].balance,
      );

    it("gives each new account its own id and history, then reverts them all", async () => {
      const svc = new ImportsService(ds);
      const staged = await svc.stage(
        OWNER_ID,
        {
          idempotencyKey: "be13-new-accounts",
          accounts: [
            { ref: "isa", name: "Stocks ISA", type: "Investment" },
            { ref: "card", name: "Credit card", type: "Credit Card" },
            { ref: "pot", name: "Rainy day", type: "Saving" },
          ],
          balances: [
            { accountRef: "isa", month: "2026-10", value: 1000 },
            { accountRef: "card", month: "2026-10", value: 250 },
            { accountRef: "pot", month: "2026-09", value: 40 },
            { accountRef: "pot", month: "2026-10", value: 60 },
          ],
        },
        NOW,
      );
      const committed = await svc.commit(OWNER_ID, staged.batchId, {}, NOW);
      expect(committed.counts.new).toBe(4);

      const accounts: Array<{ id: string; name: string; type: string; balance: string }> =
        await ds.query(`SELECT id, name, type, balance FROM accounts WHERE user_id = $1`, [
          OWNER_ID,
        ]);
      const byName = new Map(accounts.map((a) => [a.name, a]));
      expect(accounts).toHaveLength(3);
      expect(byName.get("Stocks ISA")?.type).toBe("Investment");
      expect(byName.get("Credit card")?.type).toBe("Credit Card");
      expect(byName.get("Rainy day")?.type).toBe("Saving");
      expect(Number(byName.get("Credit card")?.balance)).toBe(-250);
      expect((await history(byName.get("Stocks ISA")!.id)).map((r) => r.value)).toEqual([1000]);
      expect((await history(byName.get("Credit card")!.id)).map((r) => r.value)).toEqual([-250]);
      expect((await history(byName.get("Rainy day")!.id)).map((r) => r.value)).toEqual([40, 60]);

      const reverted = await svc.revert(OWNER_ID, staged.batchId);
      expect(reverted.revert).toEqual({ restored: 0, removed: 4, kept: 0 });
      expect(await ds.query(`SELECT id FROM accounts WHERE user_id = $1`, [OWNER_ID])).toEqual([]);
    });

    it("restores every overwritten row and only the balances nothing changed since", async () => {
      const svc = new ImportsService(ds);
      const current = await insertAccount("Current account", "Current", 500);
      const saving = await insertAccount("Saver", "Saving", 2000);
      await insertManual(current, 9, 300);
      await insertManual(current, 10, 400);
      await insertManual(saving, 10, 1900);

      const staged = await svc.stage(
        OWNER_ID,
        {
          idempotencyKey: "be13-overwrite",
          accounts: [
            { ref: "cur", name: "Current account", type: "Current" },
            { ref: "sav", name: "Saver", type: "Saving" },
          ],
          balances: [
            { accountRef: "cur", month: "2026-09", value: 310 },
            { accountRef: "cur", month: "2026-10", value: 410 },
            { accountRef: "cur", month: "2026-11", value: 520 },
            { accountRef: "sav", month: "2026-10", value: 1950 },
            { accountRef: "sav", month: "2026-11", value: 2100 },
          ],
        },
        NOW,
      );
      const committed = await svc.commit(
        OWNER_ID,
        staged.batchId,
        {
          accountMap: { cur: current, sav: saving },
          overwriteManual: ["cur:2026-09", "cur:2026-10", "sav:2026-10"],
        },
        NOW,
      );
      expect(committed.counts).toMatchObject({ new: 2, overwrite: 3, skipped: 0 });
      expect(await balanceOf(current)).toBe(520);
      expect(await balanceOf(saving)).toBe(2100);

      // The user edits the saver's balance after the commit: revert must keep it.
      await ds.query(`UPDATE accounts SET balance = 2222 WHERE id = $1`, [saving]);

      const reverted = await svc.revert(OWNER_ID, staged.batchId);
      expect(reverted.revert).toEqual({ restored: 3, removed: 2, kept: 0 });

      expect(await history(current)).toEqual([
        { month: 9, value: 300, source: "manual", asOfDate: "2026-09-01", importBatchId: null },
        { month: 10, value: 400, source: "manual", asOfDate: "2026-10-01", importBatchId: null },
      ]);
      expect(await history(saving)).toEqual([
        { month: 10, value: 1900, source: "manual", asOfDate: "2026-10-01", importBatchId: null },
      ]);
      expect(await balanceOf(current)).toBe(500);
      expect(await balanceOf(saving)).toBe(2222);
    });
  },
);
