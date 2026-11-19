import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { at } from "../../testing/must";
import { AccountIntakeService } from "../finance/account-intake.service";
import { SnapshotsService } from "./snapshots.service";

// System audit slice 4 against real Postgres: today's balance is the newest recorded month
// (decision 8 option A), a new account records its first month, a linked property and mortgage
// keep their own shares (decision 14 option B), and the reminder reads finished check-ins.
// Same throwaway-database rules as migrations.integration.spec.ts (this suite DROPs the schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/modules/snapshots/balance-rule.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-11-14T12:00:00Z");
// A sample owner id, built at runtime (a sample value, not a credential).
const USER = ["slice4", "owner"].join("-");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "slice 4 balance rule and linked pair (real Postgres)",
  () => {
    let ds: DataSource;
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
      // Only Date is faked, so the database driver's own timers keep running.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
    });

    afterEach(async () => {
      vi.useRealTimers();
      if (ds?.isInitialized) await ds.destroy();
    });

    const intake = () =>
      new AccountIntakeService(
        ds.getRepository(Account),
        ds.getRepository(AccountDetail),
        ds.getRepository(BankConnection),
      );
    const snapshots = () => new SnapshotsService(ds);

    const insertAccount = async (fields: Record<string, unknown>): Promise<string> => {
      const keys = Object.keys(fields);
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, ${keys.join(", ")}) VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING id`,
        [USER, ...Object.values(fields)],
      );
      return at(rows, 0).id;
    };
    const insertMonth = (id: string, year: number, month: number, value: number) =>
      ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, $3, $4, $5, make_date($3, $4, 1), 'manual')`,
        [id, USER, year, month, value],
      );
    const balanceOf = async (id: string): Promise<number> =>
      Number(
        at(
          await ds.query<Array<{ balance: string }>>("SELECT balance FROM accounts WHERE id = $1", [
            id,
          ]),
          0,
        ).balance,
      );
    const row = async (id: string) =>
      at(
        await ds.query(
          "SELECT ownership, share_percent, linked_account_id FROM accounts WHERE id = $1",
          [id],
        ),
        0,
      );

    it("correcting the newest recorded month moves today's balance, and a newer month wins (L68)", async () => {
      // October was checked in at £1,000 by mistake; it is now November with no November figure.
      const saver = await insertAccount({ name: "Saver", type: "Saving", balance: 1000 });
      await insertMonth(saver, 2026, 10, 1000);
      await snapshots().upsertMonth(
        USER,
        "2026-10",
        { values: [{ accountId: saver, value: 10000 }] },
        NOW,
      );
      // Before slice 4 the balance stayed at £1,000 (only a current-month write moved it).
      expect(await balanceOf(saver)).toBe(10000);

      // A November figure is newer, so a later October edit leaves today's balance alone.
      await snapshots().upsertMonth(
        USER,
        "2026-11",
        { values: [{ accountId: saver, value: 12000 }] },
        NOW,
      );
      await snapshots().upsertMonth(
        USER,
        "2026-10",
        { values: [{ accountId: saver, value: 11000 }] },
        NOW,
      );
      expect(await balanceOf(saver)).toBe(12000);
    });

    it("a mortgage with a calculated balance is worked forward from the corrected newest month", async () => {
      // October recorded as £210,000 in error. In November the user corrects October to £200,000.
      const mortgage = await insertAccount({
        name: "Mortgage",
        type: "Mortgage",
        balance: -210000,
        interest_rate: 6,
        monthly_contribution: 1500,
      });
      await insertMonth(mortgage, 2026, 10, -210000);
      await snapshots().upsertMonth(
        USER,
        "2026-10",
        { values: [{ accountId: mortgage, value: 200000 }] },
        NOW,
      );
      expect(await balanceOf(mortgage)).toBe(-200000);
      // November's calculated figure from October's £200,000 at 6% with £1,500 a month:
      // 200,000 x (1 + 0.06 / 12) - 1,500 = 200,000 x 1.005 - 1,500 = 201,000 - 1,500 = 199,500.
      // Before slice 4 the saved balance (£210,000) no longer matched the newest record, so the
      // calculated figure was withheld and this save was refused with 400.
      await snapshots().upsertMonth(
        USER,
        "2026-11",
        { values: [{ accountId: mortgage, value: 199500, source: "calculated" }] },
        NOW,
      );
      expect(await balanceOf(mortgage)).toBe(-199500);
    });

    it("a new account records its first month at once (L05)", async () => {
      const created = await intake().createAccount(USER, {
        name: "Account B",
        type: "Saving",
        balance: 5000,
      });
      const rows: Array<{ year: number; month: number; value: string; source: string }> =
        await ds.query(
          "SELECT year, month, value, source FROM account_details WHERE account_id = $1",
          [created.id],
        );
      expect(rows.map((r) => [r.year, r.month, Number(r.value), r.source])).toEqual([
        [2026, 11, 5000, "manual"],
      ]);
    });

    it("creates a linked pair in one go; later share changes stay on their own account (decision 14 B)", async () => {
      const svc = intake();
      const { mortgage, property } = await svc.createMortgageWithProperty(USER, {
        mortgage: { name: "Mortgage", balance: 186000, ownership: "joint", sharePercent: 40 },
        property: { balance: 310000 },
      });
      expect(await row(property.id)).toMatchObject({ ownership: "joint", share_percent: 40 });
      expect(await row(mortgage.id)).toMatchObject({ linked_account_id: property.id });

      await svc.updateAccount(USER, mortgage.id, { sharePercent: 50 });
      expect(await row(property.id)).toMatchObject({ share_percent: 40 });
      await svc.updateAccount(USER, property.id, { sharePercent: 60 });
      expect(await row(mortgage.id)).toMatchObject({ share_percent: 50 });

      // Deleting the property leaves the mortgage, unlinked (ON DELETE SET NULL).
      await svc.deleteAccount(USER, property.id);
      expect(await row(mortgage.id)).toMatchObject({ linked_account_id: null });
    });

    it("the reminder reads finished check-ins, not any month with a balance (L70)", async () => {
      const svc = snapshots();
      expect(await svc.latestCompletedMonth(USER)).toBeNull();
      const created = await intake().createAccount(USER, { name: "A", type: "Saving", balance: 1 });
      // A new account records November, but November's check-in is not finished.
      expect(await svc.latestCompletedMonth(USER)).toBeNull();
      await svc.upsertMonth(
        USER,
        "2026-10",
        { values: [{ accountId: created.id, value: 1 }], complete: true },
        NOW,
      );
      expect(await svc.latestCompletedMonth(USER)).toBe("2026-10");
      expect(await svc.latestCompletedMonth("someone-else")).toBeNull();
    });
  },
);
