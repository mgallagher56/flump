import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AccountIntakeService } from "../account-intake.service";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { countAccountOrphans } from "../integrity/account-orphans";
import { TaxService } from "../tax.service";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../testing/discoverMigrations";
import { TIMESTAMP_COLUMNS } from "./TimestampsWithTimeZone1794358500000";

// BE-08 (backend audit M1, M2, M3, M5): the three BE-08 migrations and the two writes that now run
// in one transaction, on real Postgres. Same throwaway-database rules as
// migrations.integration.spec.ts (this suite DROPs the public schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/migrations/data-integrity.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const FK_MIGRATION = "AccountIdForeignKeys1794358200000";
const TAX_MIGRATION = "TaxRecordAprilEndDate1794358300000";
const TZ_MIGRATION = "TimestampsWithTimeZone1794358500000";
const USER_A = "user-a";
const USER_B = "user-b";
const MISSING = "00000000-0000-4000-8000-00000000dead";

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "BE-08 data integrity (real Postgres)",
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
    });

    afterEach(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    const applied = async (): Promise<string[]> =>
      (await ds.query("SELECT name FROM migrations ORDER BY id")).map(
        (r: { name: string }) => r.name,
      );
    const undoThrough = async (name: string): Promise<void> => {
      while ((await applied()).includes(name)) await ds.undoLastMigration();
    };
    const count = async (sql: string, params: unknown[] = []): Promise<number> =>
      (await ds.query(`SELECT count(*)::int AS n FROM ${sql}`, params))[0].n;

    const insertAccount = async (user: string, type = "Current", balance = 100): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ($1, 'Account', $2, $3, 'GBP') RETURNING id`,
          [user, type, balance],
        )
      )[0].id;
    const insertDetail = (accountId: string, user: string, month: number, value = 100) =>
      ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
       VALUES ($1, $2, 2026, $3, $4, make_date(2026, $3, 1), 'manual')`,
        [accountId, user, month, value],
      );
    const insertTransaction = (accountId: string, user: string) =>
      ds.query(
        `INSERT INTO transactions (account_id, user_id, amount, description, category)
       VALUES ($1, $2, -5, 'Coffee', 'Food')`,
        [accountId, user],
      );

    describe(FK_MIGRATION, () => {
      const columnType = async (table: string): Promise<string> =>
        (
          await ds.query(
            `SELECT data_type FROM information_schema.columns
           WHERE table_name = $1 AND column_name = 'account_id'`,
            [table],
          )
        )[0].data_type;
      const foreignKeys = async (): Promise<Array<{ name: string; valid: boolean; def: string }>> =>
        ds.query(
          `SELECT conname AS name, convalidated AS valid, pg_get_constraintdef(oid) AS def
         FROM pg_constraint WHERE conname IN ('FK_account_details_account', 'FK_transactions_account')
         ORDER BY conname`,
        );

      /** Pre-migration fixtures: kept rows, plus one orphan of each kind per table. */
      const seed = async () => {
        const a = await insertAccount(USER_A);
        const b = await insertAccount(USER_B);
        await insertDetail(a, USER_A, 1);
        await insertDetail(a.toUpperCase(), USER_A, 2); // a uuid in upper case still names `a`
        await insertDetail("legacy-1", USER_A, 3); // not a uuid
        await insertDetail(MISSING, USER_A, 4); // account deleted without its history
        await insertDetail(b, USER_A, 5); // another user's account
        await insertDetail(b, USER_B, 6);
        await insertTransaction(a, USER_A);
        await insertTransaction("legacy-2", USER_A);
        await insertTransaction(MISSING, USER_A);
        await insertTransaction(b, USER_A);
        await insertTransaction(b, USER_B);
        return { a, b };
      };

      it("reports orphans, deletes them, converts to uuid and adds validated cascading keys", async () => {
        await ds.runMigrations();
        await undoThrough(FK_MIGRATION);
        expect(await columnType("account_details")).toBe("character varying");
        const { a, b } = await seed();

        expect(await countAccountOrphans(ds)).toEqual([
          { table: "account_details", notUuid: 1, missingAccount: 1, otherUsersAccount: 1 },
          { table: "transactions", notUuid: 1, missingAccount: 1, otherUsersAccount: 1 },
        ]);

        await ds.runMigrations();

        expect(await columnType("account_details")).toBe("uuid");
        expect(await columnType("transactions")).toBe("uuid");
        expect(await countAccountOrphans(ds)).toEqual([
          { table: "account_details", notUuid: 0, missingAccount: 0, otherUsersAccount: 0 },
          { table: "transactions", notUuid: 0, missingAccount: 0, otherUsersAccount: 0 },
        ]);
        expect(
          await ds.query("SELECT account_id, user_id, month FROM account_details ORDER BY month"),
        ).toEqual([
          { account_id: a, user_id: USER_A, month: 1 },
          { account_id: a, user_id: USER_A, month: 2 },
          { account_id: b, user_id: USER_B, month: 6 },
        ]);
        expect(await count("transactions WHERE account_id = $1", [a])).toBe(1);
        expect(await count("transactions WHERE account_id = $1", [b])).toBe(1);
        expect(await count("transactions")).toBe(2);

        const keys = await foreignKeys();
        expect(keys.map((k) => [k.name, k.valid])).toEqual([
          ["FK_account_details_account", true],
          ["FK_transactions_account", true],
        ]);
        for (const k of keys) expect(k.def).toMatch(/REFERENCES accounts\(id\) ON DELETE CASCADE/);

        // The keys hold: no row may name a missing account, and a delete cascades.
        await expect(insertDetail(MISSING, USER_A, 7)).rejects.toThrow(
          /FK_account_details_account/,
        );
        await expect(insertTransaction(MISSING, USER_A)).rejects.toThrow(/FK_transactions_account/);
        await ds.query("DELETE FROM accounts WHERE id = $1", [a]);
        expect(await count("account_details WHERE account_id = $1", [a])).toBe(0);
        expect(await count("transactions WHERE account_id = $1", [a])).toBe(0);
        expect(await count("account_details WHERE account_id = $1", [b])).toBe(1);
      });

      it("keeps BE-05's liability checks working on the uuid column", async () => {
        await ds.runMigrations();
        const card = await insertAccount(USER_A, "Current", 50);
        await insertDetail(card, USER_A, 1, 50);
        // A type change to a liability with positive history is refused (accounts trigger).
        await expect(
          ds.query("UPDATE accounts SET type = 'Overdraft', balance = -50 WHERE id = $1", [card]),
        ).rejects.toThrow(/liability history must be stored negative/);
        // A positive history row on a liability is refused (account_details trigger).
        const loan = await insertAccount(USER_A, "Loan", -10);
        await expect(insertDetail(loan, USER_A, 2, 10)).rejects.toThrow(
          /liability history must be stored negative/,
        );
      });

      it("is a no-op on an empty database, and down() restores varchar without the keys", async () => {
        await ds.runMigrations();
        const a = await insertAccount(USER_A);
        await insertDetail(a, USER_A, 1);
        await insertTransaction(a, USER_A);

        await undoThrough(FK_MIGRATION);
        expect(await columnType("account_details")).toBe("character varying");
        expect(await columnType("transactions")).toBe("character varying");
        expect(await foreignKeys()).toEqual([]);
        expect(await count("account_details WHERE account_id = $1", [a])).toBe(1);
        expect(await count("transactions WHERE account_id = $1", [a])).toBe(1);
        // BE-05's checks still work on the text column after the revert.
        await expect(
          ds.query("UPDATE accounts SET type = 'Overdraft', balance = -100 WHERE id = $1", [a]),
        ).rejects.toThrow(/liability history must be stored negative/);

        // Up again on top of the reverted schema.
        await ds.runMigrations();
        expect(await columnType("account_details")).toBe("uuid");
        expect((await foreignKeys()).length).toBe(2);
      });

      it("adds the keys to a synchronize-built database whose columns are already uuid", async () => {
        await ds.synchronize();
        const a = await insertAccount(USER_A);
        await insertDetail(a, USER_A, 1);
        await insertDetail(MISSING, USER_A, 2);
        await ds.runMigrations();
        expect((await foreignKeys()).map((k) => k.valid)).toEqual([true, true]);
        expect(await count("account_details")).toBe(1);
      });
    });

    describe(TAX_MIGRATION, () => {
      const insertTax = (date: string, endDate: string | null, frequency = "annual") =>
        ds.query(
          `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date, end_date)
         VALUES ($1, 'income', 'paye', 'salary', $2, 100, $3, $4, $5)`,
          [USER_A, `${frequency} ${date} ${endDate}`, frequency, date, endDate],
        );
      const endDates = async (): Promise<Array<{ name: string; end: string | null }>> =>
        ds.query(
          `SELECT name, to_char(end_date, 'YYYY-MM-DD') AS "end" FROM tax_records ORDER BY name`,
        );

      it("moves annual records dated 1-5 April to the tax year ending that 5 April; down() restores", async () => {
        await ds.runMigrations();
        await undoThrough(TAX_MIGRATION);
        await insertTax("2026-04-03", "2027-04-05"); // the M1 bug: filed under 2026/27
        await insertTax("2025-04-05", "2026-04-05");
        await insertTax("2026-04-06", "2027-04-05"); // right already
        await insertTax("2026-03-31", "2026-04-05"); // right already
        await insertTax("2026-04-02", "2030-04-05"); // not what the old rule wrote: left alone
        await insertTax("2026-04-03", "2027-04-05", "monthly"); // not annual: left alone
        const before = await endDates();

        await ds.runMigrations();
        expect(await endDates()).toEqual([
          { name: "annual 2025-04-05 2026-04-05", end: "2025-04-05" },
          { name: "annual 2026-03-31 2026-04-05", end: "2026-04-05" },
          { name: "annual 2026-04-02 2030-04-05", end: "2030-04-05" },
          { name: "annual 2026-04-03 2027-04-05", end: "2026-04-05" },
          { name: "annual 2026-04-06 2027-04-05", end: "2027-04-05" },
          { name: "monthly 2026-04-03 2027-04-05", end: "2027-04-05" },
        ]);

        await undoThrough(TAX_MIGRATION);
        expect(await endDates()).toEqual(before);
      });
    });

    describe(TZ_MIGRATION, () => {
      const naiveColumns = async (): Promise<string[]> =>
        (
          await ds.query(
            `SELECT table_name || '.' || column_name AS c FROM information_schema.columns
           WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'
           ORDER BY 1`,
          )
        ).map((r: { c: string }) => r.c);
      const fileNode = async (table: string): Promise<number> =>
        (
          await ds.query("SELECT relfilenode::int AS n FROM pg_class WHERE relname = $1", [table])
        )[0].n;

      it("leaves no timestamp without a time zone, keeps every instant as UTC and rewrites no table", async () => {
        await ds.runMigrations();
        expect(await naiveColumns()).toEqual([]);

        await undoThrough(TZ_MIGRATION);
        expect(await naiveColumns()).toEqual(TIMESTAMP_COLUMNS.map(([t, c]) => `${t}.${c}`).sort());
        const a = await insertAccount(USER_A);
        await ds.query("UPDATE accounts SET created_at = '2026-06-01 12:34:56' WHERE id = $1", [a]);
        await insertTransaction(a, USER_A);
        await ds.query(`UPDATE transactions SET "timestamp" = '2026-01-15 08:00:00'`);
        const nodes = {
          accounts: await fileNode("accounts"),
          transactions: await fileNode("transactions"),
        };

        await ds.runMigrations();
        expect(await naiveColumns()).toEqual([]);
        const [row] = await ds.query(
          `SELECT a.created_at AS created, t."timestamp" AS ts
         FROM accounts a JOIN transactions t ON t.account_id = a.id`,
        );
        expect((row.created as Date).toISOString()).toBe("2026-06-01T12:34:56.000Z");
        expect((row.ts as Date).toISOString()).toBe("2026-01-15T08:00:00.000Z");
        // Binary-coercible under UTC: the tables keep their storage files (no rewrite).
        expect(await fileNode("accounts")).toBe(nodes.accounts);
        expect(await fileNode("transactions")).toBe(nodes.transactions);

        await undoThrough(TZ_MIGRATION);
        const [wall] = await ds.query(
          "SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS w FROM accounts WHERE id = $1",
          [a],
        );
        expect(wall.w).toBe("2026-06-01 12:34:56");
      });
    });

    describe("deleteAccount runs in one transaction (E1 D-06)", () => {
      const service = () =>
        new AccountIntakeService(
          ds.getRepository(Account),
          ds.getRepository(AccountDetail),
          ds.getRepository(UserProfile),
          ds.getRepository(BankConnection),
        );
      const children = async (id: string) => ({
        details: await count("account_details WHERE account_id = $1", [id]),
        transactions: await count("transactions WHERE account_id = $1", [id]),
      });

      it("deletes the account with its history and transactions, leaving no orphans", async () => {
        await ds.runMigrations();
        const a = await insertAccount(USER_A);
        const keep = await insertAccount(USER_A);
        await insertDetail(a, USER_A, 1);
        await insertDetail(a, USER_A, 2);
        await insertTransaction(a, USER_A);
        await insertDetail(keep, USER_A, 1);

        expect(await service().deleteAccount(USER_A, a)).toEqual({ success: true });

        expect(await count("accounts WHERE id = $1", [a])).toBe(0);
        expect(await children(a)).toEqual({ details: 0, transactions: 0 });
        expect(await children(keep)).toEqual({ details: 1, transactions: 0 });
        const orphans = await countAccountOrphans(ds);
        expect(orphans.every((o) => o.notUuid + o.missingAccount + o.otherUsersAccount === 0)).toBe(
          true,
        );
      });

      it("deletes nothing for another user's account id (404)", async () => {
        await ds.runMigrations();
        const a = await insertAccount(USER_A);
        await insertDetail(a, USER_A, 1);
        await insertTransaction(a, USER_A);

        await expect(service().deleteAccount(USER_B, a)).rejects.toBeInstanceOf(NotFoundException);

        expect(await count("accounts WHERE id = $1", [a])).toBe(1);
        expect(await children(a)).toEqual({ details: 1, transactions: 1 });
      });

      it("rolls back every child delete when the account delete fails", async () => {
        await ds.runMigrations();
        const a = await insertAccount(USER_A);
        await insertDetail(a, USER_A, 1);
        await insertTransaction(a, USER_A);
        await ds.query(
          `CREATE FUNCTION be08_refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $$
         BEGIN RAISE EXCEPTION 'refused for the test'; END $$`,
        );
        await ds.query(
          `CREATE TRIGGER be08_refuse BEFORE DELETE ON accounts
         FOR EACH ROW EXECUTE FUNCTION be08_refuse_delete()`,
        );

        await expect(service().deleteAccount(USER_A, a)).rejects.toThrow(/refused for the test/);

        expect(await count("accounts WHERE id = $1", [a])).toBe(1);
        expect(await children(a)).toEqual({ details: 1, transactions: 1 });
      });
    });

    describe("tax bulk write runs in one transaction (audit M3)", () => {
      const base = { type: "income", source: "paye", category: "salary", amount: 100 } as const;

      it("a failed bulk write leaves no rows and applies no caps", async () => {
        await ds.runMigrations();
        const records = ds.getRepository(TaxRecord);
        const previous = await records.save(
          records.create({
            ...base,
            userId: USER_A,
            name: "Old",
            frequency: "monthly",
            date: "2025-04-06",
          }),
        );
        const service = new TaxService(records);

        await expect(
          service.createBulk(USER_A, {
            capPreviousRecordIds: [{ id: previous.id, endDate: "2026-04-05" }],
            records: [
              { ...base, name: "New 1", frequency: "monthly", date: "2026-04-06" },
              // NOT NULL violation on insert: the whole batch, caps included, must roll back.
              { ...base, name: null as never, frequency: "monthly", date: "2026-04-06" },
            ],
          }),
        ).rejects.toThrow(/null value in column "name"/);

        expect(await count("tax_records WHERE user_id = $1", [USER_A])).toBe(1);
        expect((await records.findOneByOrFail({ id: previous.id })).endDate).toBeNull();
      });

      it("writes caps and records together when every row is valid", async () => {
        await ds.runMigrations();
        const records = ds.getRepository(TaxRecord);
        const previous = await records.save(
          records.create({
            ...base,
            userId: USER_A,
            name: "Old",
            frequency: "monthly",
            date: "2025-04-06",
          }),
        );
        const created = await new TaxService(records).createBulk(USER_A, {
          capPreviousRecordIds: [{ id: previous.id, endDate: "2026-04-05" }],
          records: [{ ...base, name: "Annual", frequency: "annual", date: "2026-04-03" }],
        });
        expect(created).toHaveLength(1);
        // Audit M1 acceptance: a record dated 3 April 2026 files under 2025/26.
        expect(created[0]?.endDate).toBe("2026-04-05");
        expect((await records.findOneByOrFail({ id: previous.id })).endDate).toBe("2026-04-05");
      });
    });
  },
);
