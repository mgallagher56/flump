import "reflect-metadata";
import type { ConfigService } from "@nestjs/config";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations } from "../../testing/discoverMigrations";
import { emptyEntityTables } from "../../testing/emptyTables";
import { LoggingBankConsentRevoker } from "../banking/bank-consent-revoker";
import type { BankProviderRegistry } from "../banking/providers/provider.registry";
import { AccountIntakeService } from "../finance/account-intake.service";
import { FinanceService } from "../finance/finance.service";
import { AccountDeletionService } from "../privacy/account-deletion.service";
import { UserProfileService } from "../profile/user-profile.service";
import { FinancialPictureService } from "./financial-picture.service";

// FinancialPictureService.load on real Postgres: one user's rows only, net worth under that
// user's own choices, and no receipt column read. Drops the public schema, so a throwaway
// database only (see user-data.integration.spec.ts for the docker command):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_test \
//     bunx vitest run src/modules/agent/financial-picture.integration.spec.ts
// made-up test user ids
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
const USER_A = "user_01HZX3Q9V7C2M8N4P6R0S5T1PA";
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
const USER_B = "user_01HZX3Q9V7C2M8N4P6R0S5T1PB";
const AS_OF = new Date("2026-11-19T12:00:00Z");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "financial picture load (real Postgres)",
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
    });

    const repo = <E extends object>(e: new () => E) => ds.getRepository(e);
    const service = () => {
      const revoker = new LoggingBankConsentRevoker();
      const identity = new InMemoryIdentityAdapter();
      const intake = new AccountIntakeService(
        repo(Account),
        repo(AccountDetail),
        repo(BankConnection),
      );
      const profiles = new UserProfileService(
        repo(UserProfile),
        repo(Account),
        repo(AccountDetail),
        repo(BankConnection),
        identity,
        ds,
        revoker,
        new AccountDeletionService(ds, identity, revoker),
      );
      // The provider registry and config are only used by bank sync, which load() never calls.
      const finance = new FinanceService(
        repo(Account),
        repo(Transaction),
        repo(AccountDetail),
        repo(BankConnection),
        repo(UserProfile),
        {} as BankProviderRegistry,
        {} as ConfigService,
        intake,
      );
      return new FinancialPictureService(repo(BudgetEntry), repo(TaxRecord), finance, profiles);
    };

    it("loads only the caller's rows and counts net worth under the caller's choices", async () => {
      const m = ds.manager;
      // A leaves property (and so its mortgage) out; B chose the opposite.
      await m.save(
        m.create(UserProfile, {
          userId: USER_A,
          netWorthCountsProperty: false,
          netWorthCountsStudentLoan: false,
        }),
      );
      await m.save(
        m.create(UserProfile, {
          userId: USER_B,
          netWorthCountsProperty: true,
          netWorthCountsStudentLoan: true,
        }),
      );
      // Liabilities are stored negative (BE-05).
      for (const [name, type, balance] of [
        ["A current", "Current", 2000],
        ["A home", "Property", 200000],
        ["A mortgage", "Mortgage", -150000],
      ] as const) {
        await m.save(m.create(Account, { userId: USER_A, name, type, balance }));
      }
      const bAccount = await m.save(
        m.create(Account, { userId: USER_B, name: "B current", type: "Current", balance: 999999 }),
      );
      const bBudget = await m.save(
        m.create(BudgetEntry, {
          userId: USER_B,
          category: "Groceries",
          name: "B food",
          amount: 777,
        }),
      );
      await m.save(
        m.create(BudgetEntry, {
          userId: USER_A,
          category: "Groceries",
          name: "A food",
          amount: 300,
        }),
      );
      const taxRow = (userId: string, name: string, amount: number) =>
        m.create(TaxRecord, {
          userId,
          type: "expense",
          source: "self-employed",
          category: "Office",
          name,
          amount,
          date: "2026-10-01",
          receiptFilename: `${name}.pdf`,
          receiptMimeType: "application/pdf",
          receiptData: `receipt-bytes-${name}`,
        });
      await m.save(taxRow(USER_A, "A desk", 120));
      const bTax = await m.save(taxRow(USER_B, "B desk", 888));

      const { rows, picture } = await service().load(USER_A, { asOf: AS_OF });

      // Only A's rows: no B id, name or amount anywhere.
      expect(rows.accounts.map((a) => a.name).sort()).toEqual([
        "A current",
        "A home",
        "A mortgage",
      ]);
      expect(rows.budgetEntries.map((b) => b.name)).toEqual(["A food"]);
      expect(rows.taxRecords.map((t) => t.name)).toEqual(["A desk"]);
      const loaded = JSON.stringify({
        accounts: rows.accounts,
        budgetEntries: rows.budgetEntries,
        taxRecords: rows.taxRecords,
      });
      for (const leak of [USER_B, bAccount.id, bBudget.id, bTax.id, "999999", "777", "888"]) {
        expect(loaded).not.toContain(leak);
      }

      // Tax records come back without any receipt column (receiptData is never selected). The
      // entity class declares every field, so an unselected column is present but undefined.
      for (const record of rows.taxRecords as unknown as Partial<TaxRecord>[]) {
        expect(record.receiptData).toBeUndefined();
        expect(record.receiptFilename).toBeUndefined();
        expect(record.receiptMimeType).toBeUndefined();
        expect(record.userId).toBeUndefined();
      }
      expect(loaded).not.toContain("receipt-bytes");

      // Worked by hand. A chose netWorthCountsProperty = false, and the engine's basis
      // (countsTowardNetWorth in net-worth-basis.ts) leaves out both the "property" and the
      // "mortgages" category under that choice, so the home (£200,000) and the mortgage
      // (-£150,000) both drop out. That leaves the current account: net worth = £2,000.
      // (Had property counted it would be 2,000 + 200,000 - 150,000 = £52,000.)
      expect(picture.netWorth.netWorth).toBe(2000);
    });
  },
);
