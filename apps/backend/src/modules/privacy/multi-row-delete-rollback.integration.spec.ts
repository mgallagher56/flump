import "reflect-metadata";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { AuditEvent } from "../../entities/audit-event.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations } from "../../testing/discoverMigrations";
import { emptyEntityTables } from "../../testing/emptyTables";
import { financeServiceWithIntake } from "../../testing/finance-service";
import { LoggingBankConsentRevoker } from "../banking/bank-consent-revoker";
import type { BankProviderRegistry } from "../banking/providers/provider.registry";
import { UserProfileService } from "../profile/user-profile.service";
import { AccountDeletionService } from "./account-deletion.service";

// E1 D-06 / C-18 on real Postgres: the multi-row deletes not already covered elsewhere (the
// financial data reset and the bank disconnect) commit whole or not at all. Account deletion is
// covered in data-integrity.integration.spec.ts and erasure in user-data.integration.spec.ts.
// A BEFORE DELETE trigger on accounts fails the delete part-way, after earlier tables in the same
// transaction have already been deleted from. Drops the public schema: a throwaway database only.
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_rollback_test \
//     bunx vitest run src/modules/privacy/multi-row-delete-rollback.integration.spec.ts
// Made-up ids, built at runtime.
const PERSON_A = ["rollback", "person", "a"].join("-");
const PERSON_B = ["rollback", "person", "b"].join("-");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "multi-row deletes roll back whole (real Postgres)",
  () => {
    let ds: DataSource;
    const savedNodeEnv = process.env.NODE_ENV;

    beforeAll(async () => {
      const url = process.env.TEST_DATABASE_URL as string;
      assertSafeTestDatabase(url, process.env);
      process.env.NODE_ENV = "test";
      const options = typeOrmOptionsFromEnv({ NODE_ENV: "test", DATABASE_URL: url });
      ds = new DataSource({
        ...(options as DataSourceOptions),
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
    }, 60_000);

    afterAll(async () => {
      process.env.NODE_ENV = savedNodeEnv;
      if (ds?.isInitialized) await ds.destroy();
    });

    beforeEach(async () => {
      await emptyEntityTables(ds);
      vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    /** A connection with one synced account, its history and a transaction, plus a budget line. */
    const seed = async (userId: string) => {
      const m = ds.manager;
      const connection = await m.save(
        m.create(BankConnection, {
          userId,
          institutionId: "monzo",
          institutionName: "Test Bank",
          status: "connected",
          authType: "oauth",
        }),
      );
      const account = await m.save(
        m.create(Account, {
          userId,
          name: "Saver",
          type: "Saving",
          balance: 1234.5,
          connectionId: connection.id,
        }),
      );
      await m.save(
        m.create(AccountDetail, {
          accountId: account.id,
          userId,
          year: 2026,
          month: 10,
          value: 1000,
          asOfDate: "2026-10-31",
        }),
      );
      await m.save(
        m.create(Transaction, {
          accountId: account.id,
          userId,
          amount: -12.34,
          description: "coffee",
          category: "food",
        }),
      );
      await m.save(
        m.create(BudgetEntry, { userId, category: "housing", name: "rent", amount: 900 }),
      );
      await m.save(m.create(UserProfile, { userId, firstName: "Test", annualSalary: 50000 }));
      return { connectionId: connection.id, accountId: account.id };
    };

    const count = async (table: string, userId: string): Promise<number> => {
      const [{ n }] = await ds.query(
        `SELECT count(*)::int AS n FROM "${table}" WHERE user_id = $1`,
        [userId],
      );
      return n;
    };
    const snapshot = async (userId: string) => ({
      bank_connections: await count("bank_connections", userId),
      accounts: await count("accounts", userId),
      account_details: await count("account_details", userId),
      transactions: await count("transactions", userId),
      budget_entries: await count("budget_entries", userId),
      audit_events: await count("audit_events", userId),
    });

    /** Fails every DELETE on accounts, so the deletes before it in the transaction must undo. */
    const withFailingAccountDelete = async (run: () => Promise<unknown>) => {
      await ds.query(`CREATE FUNCTION e1_fail() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'e1 forced failure'; END $$`);
      await ds.query(
        "CREATE TRIGGER e1_fail BEFORE DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION e1_fail()",
      );
      try {
        await run();
      } finally {
        await ds.query("DROP TRIGGER e1_fail ON accounts");
        await ds.query("DROP FUNCTION e1_fail()");
      }
    };

    const profileService = () => {
      const identity = new InMemoryIdentityAdapter();
      const revoker = new LoggingBankConsentRevoker();
      return new UserProfileService(
        ds.getRepository(UserProfile),
        ds.getRepository(Account),
        ds.getRepository(AccountDetail),
        ds.getRepository(BankConnection),
        identity,
        ds,
        revoker,
        new AccountDeletionService(ds, identity, revoker),
      );
    };

    const financeService = () =>
      financeServiceWithIntake(
        ds.getRepository(Account),
        ds.getRepository(AccountDetail),
        ds.getRepository(BankConnection),
        ds.getRepository(UserProfile),
        { getProvider: () => undefined } as unknown as BankProviderRegistry,
        { get: () => undefined } as unknown as ConfigService,
      );

    it("a financial data reset that fails part-way leaves every row and the profile as they were", async () => {
      await seed(PERSON_A);
      const before = await snapshot(PERSON_A);
      // Sanity: transactions and account_details come before accounts in the registry order, so the
      // reset has really deleted them when the accounts trigger fires.
      expect(before).toMatchObject({ transactions: 1, account_details: 1 });

      await withFailingAccountDelete(() =>
        expect(profileService().resetFinancialData(PERSON_A)).rejects.toThrow(/e1 forced failure/),
      );

      expect(await snapshot(PERSON_A)).toEqual(before);
      const profile = await ds.getRepository(UserProfile).findOneByOrFail({ userId: PERSON_A });
      expect(Number(profile.annualSalary)).toBe(50000);
    });

    it("the same reset without the failure clears the rows, so the rollback above is real", async () => {
      await seed(PERSON_A);
      await profileService().resetFinancialData(PERSON_A);
      const after = await snapshot(PERSON_A);
      expect(after).toMatchObject({
        bank_connections: 0,
        accounts: 0,
        account_details: 0,
        transactions: 0,
        budget_entries: 0,
      });
    });

    it("a bank disconnect that fails part-way keeps the connection, its accounts, history and transactions", async () => {
      const mine = await seed(PERSON_A);
      await seed(PERSON_B);
      const before = await snapshot(PERSON_A);
      const otherBefore = await snapshot(PERSON_B);

      await withFailingAccountDelete(() =>
        expect(financeService().deleteBankConnection(PERSON_A, mine.connectionId)).rejects.toThrow(
          /e1 forced failure/,
        ),
      );

      // account_details and transactions were deleted before accounts in the same transaction.
      expect(await snapshot(PERSON_A)).toEqual(before);
      expect(await snapshot(PERSON_B)).toEqual(otherBefore);
      // No audit row for a disconnect that did not happen.
      expect(
        await ds.getRepository(AuditEvent).countBy({ action: "bank_connection.disconnected" }),
      ).toBe(0);
    });

    it("the same disconnect without the failure removes the connection's rows and records it", async () => {
      const mine = await seed(PERSON_A);
      await financeService().deleteBankConnection(PERSON_A, mine.connectionId);
      expect(await snapshot(PERSON_A)).toMatchObject({
        bank_connections: 0,
        accounts: 0,
        account_details: 0,
        transactions: 0,
        budget_entries: 1,
      });
      expect(
        await ds.getRepository(AuditEvent).countBy({ action: "bank_connection.disconnected" }),
      ).toBe(1);
    });
  },
);
