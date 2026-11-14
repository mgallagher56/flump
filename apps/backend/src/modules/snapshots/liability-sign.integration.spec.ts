import "reflect-metadata";
import { BankSyncOrchestrator } from "@flump/banking/server";
import type { ConfigService } from "@nestjs/config";
import { DataSource, type DataSourceOptions, type QueryRunner } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import {
  BEFORE_IMAGE_TABLE,
  planLiabilitySignBackfill,
} from "../../integrity/liability-sign-backfill";
import { LiabilitySignRule1794358050000 } from "../../migrations/LiabilitySignRule1794358050000";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { accessTokenAad } from "../banking/bank-connection-sync";
import type { BankProvider } from "../banking/providers/provider.interface";
import type { BankProviderRegistry } from "../banking/providers/provider.registry";
import { AccountIntakeService } from "../finance/account-intake.service";
import { FinanceService } from "../finance/finance.service";
import { ImportsService } from "../imports/imports.service";
import { writeOnboardingSnapshot } from "./first-snapshot";
import { SnapshotsService } from "./snapshots.service";
import { STORED_NEGATIVE_ACCOUNT_TYPES } from "./stored-balance";

// BE-05 (audit H6): every write path stores a liability negative, the backfill corrects old rows,
// and the database refuses a wrong-sign row. Real Postgres only; same throwaway-database rules
// as migrations.integration.spec.ts (this suite DROPs the public schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/modules/snapshots/liability-sign.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const MIGRATION_NAME = "LiabilitySignRule1794358050000";
const NOW = new Date("2026-11-14T12:00:00Z");
const USER = "user-be05";

// Every account type the API accepts, with whether it is stored negative.
const ALL_TYPES = [
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
  "Property",
  "Student Loan",
  "Overdraft",
] as const;
const LIABILITY = new Set<string>(STORED_NEGATIVE_ACCOUNT_TYPES);
// Signed inputs, including the edge cases (zero, a penny, a large debt).
const VALUES = [500, -500, 0.01, -0.01, 0, 123456.78];
const expected = (type: string, value: number): number =>
  LIABILITY.has(type) && value !== 0 ? -Math.abs(value) : value;

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "liability sign rule (real Postgres)",
  () => {
    let ds: DataSource;
    let options: DataSourceOptions;
    let migrations: MigrationClass[] = [];

    beforeAll(async () => {
      migrations = await discoverMigrations();
    });

    beforeEach(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      options = typeOrmOptionsFromEnv({
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

    /** Every migration up to (not including) BE-05: the schema the backfill meets in production. */
    const migrateToBeforeRule = async (): Promise<void> => {
      await ds.runMigrations();
      while ((await applied()).includes(MIGRATION_NAME)) await ds.undoLastMigration();
    };

    /**
     * Pending migrations up to and including BE-05 only, so a test can look at what the backfill
     * left before AccountIdForeignKeys1794358200000 deletes orphan history (such as "legacy-1").
     */
    const runMigrationsThroughRule = async (): Promise<void> => {
      const stamp = (m: MigrationClass) => Number(m.name.match(/(\d{13})$/)?.[1] ?? 0);
      const upTo = new DataSource({
        ...options,
        migrations: migrations.filter((m) => stamp(m) <= 1794358050000),
        synchronize: false,
        migrationsRun: false,
      });
      await upTo.initialize();
      try {
        await upTo.runMigrations();
      } finally {
        await upTo.destroy();
      }
    };

    const inTransaction = async (work: (qr: QueryRunner) => Promise<void>): Promise<void> => {
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await work(runner);
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      } finally {
        await runner.release();
      }
    };

    const insertAccount = async (type: string, balance: number, user = USER): Promise<string> => {
      const [row] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
       VALUES ($1, 'Account', $2, $3, 'GBP') RETURNING id`,
        [user, type, balance],
      );
      return row.id;
    };

    const insertDetail = async (
      accountId: string,
      month: number,
      value: number,
      user = USER,
    ): Promise<number> => {
      const day = new Date(Date.UTC(2026, month, 0)).getUTCDate();
      const [row] = await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
       VALUES ($1, $2, 2026, $3, $4, $5, 'manual') RETURNING id`,
        [accountId, user, month, value, `2026-${String(month).padStart(2, "0")}-${day}`],
      );
      return row.id;
    };

    const balanceOf = async (id: string): Promise<number> =>
      Number((await ds.query("SELECT balance FROM accounts WHERE id = $1", [id]))[0].balance);

    const historyOf = async (id: string): Promise<number[]> =>
      (
        await ds.query(
          "SELECT value FROM account_details WHERE account_id = $1 ORDER BY year, month",
          [id],
        )
      ).map((r: { value: string }) => Number(r.value));

    /** The invariant: no liability row anywhere is stored positive. */
    const wrongSignRows = async (): Promise<number> => {
      const [{ n }] = await ds.query(
        `SELECT (
         (SELECT count(*) FROM accounts WHERE type = ANY($1) AND balance > 0) +
         (SELECT count(*) FROM account_details d JOIN accounts a ON a.id::text = d.account_id::text
          WHERE a.type = ANY($1) AND d.value > 0)
       )::int AS n`,
        [[...STORED_NEGATIVE_ACCOUNT_TYPES]],
      );
      return n;
    };

    const intake = () =>
      new AccountIntakeService(
        ds.getRepository(Account),
        ds.getRepository(AccountDetail),
        ds.getRepository(UserProfile),
        ds.getRepository(BankConnection),
      );

    describe("backfill migration", () => {
      const seedMixedSigns = async () => {
        const card = await insertAccount("Credit Card", 500);
        const mortgage = await insertAccount("Mortgage", -200000);
        const studentLoan = await insertAccount("Student Loan", 42000);
        const overdraft = await insertAccount("Overdraft", 0);
        const current = await insertAccount("Current", -150);
        const saving = await insertAccount("Saving", 3000);
        await insertDetail(card, 9, 450);
        await insertDetail(card, 10, -480);
        await insertDetail(mortgage, 10, -200500);
        await insertDetail(studentLoan, 8, 41000);
        await insertDetail(studentLoan, 9, 41500);
        await insertDetail(current, 10, -150);
        await insertDetail(saving, 10, 3000);
        // A history row whose account id names no account (legacy text id): never touched.
        await ds.query(
          `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ('legacy-1', $1, 2026, 10, 75, '2026-10-31', 'manual')`,
          [USER],
        );
        return { card, mortgage, studentLoan, overdraft, current, saving };
      };

      it("re-signs only positive liability rows, records a before-image and logs the plan's counts", async () => {
        await migrateToBeforeRule();
        const ids = await seedMixedSigns();
        await insertAccount("Loan", 900, "user-other");

        const plan = await planLiabilitySignBackfill(ds);
        expect(plan).toEqual({
          accounts: [
            { type: "Credit Card", rows: 1 },
            { type: "Loan", rows: 1 },
            { type: "Student Loan", rows: 1 },
          ],
          accountDetails: [
            { type: "Credit Card", rows: 1 },
            { type: "Student Loan", rows: 2 },
          ],
          users: 2,
        });

        await runMigrationsThroughRule();

        expect(await balanceOf(ids.card)).toBe(-500);
        expect(await balanceOf(ids.mortgage)).toBe(-200000);
        expect(await balanceOf(ids.studentLoan)).toBe(-42000);
        expect(await balanceOf(ids.overdraft)).toBe(0);
        expect(await balanceOf(ids.current)).toBe(-150);
        expect(await balanceOf(ids.saving)).toBe(3000);
        expect(await historyOf(ids.card)).toEqual([-450, -480]);
        expect(await historyOf(ids.mortgage)).toEqual([-200500]);
        expect(await historyOf(ids.studentLoan)).toEqual([-41000, -41500]);
        expect(await historyOf(ids.current)).toEqual([-150]);
        expect(await historyOf(ids.saving)).toEqual([3000]);
        expect(await historyOf("legacy-1")).toEqual([75]);
        expect(await wrongSignRows()).toBe(0);

        const image = await ds.query(
          `SELECT table_name, old_value::float AS old, new_value::float AS new
         FROM ${BEFORE_IMAGE_TABLE} ORDER BY table_name, old_value`,
        );
        expect(image).toEqual([
          { table_name: "account_details", old: 450, new: -450 },
          { table_name: "account_details", old: 41000, new: -41000 },
          { table_name: "account_details", old: 41500, new: -41500 },
          { table_name: "accounts", old: 500, new: -500 },
          { table_name: "accounts", old: 900, new: -900 },
          { table_name: "accounts", old: 42000, new: -42000 },
        ]);
        // Nothing left to change: the dry run after deploy reads all zeros.
        expect(await planLiabilitySignBackfill(ds)).toEqual({
          accounts: [],
          accountDetails: [],
          users: 0,
        });
      }, 30_000);

      it("is idempotent: running it again changes nothing and adds no before-image rows", async () => {
        await migrateToBeforeRule();
        const ids = await seedMixedSigns();
        await ds.runMigrations();
        const imageRows = async () =>
          Number((await ds.query(`SELECT count(*) FROM ${BEFORE_IMAGE_TABLE}`))[0].count);
        const before = await imageRows();

        await inTransaction((qr) => new LiabilitySignRule1794358050000().up(qr));

        expect(await imageRows()).toBe(before);
        expect(await balanceOf(ids.card)).toBe(-500);
        expect(await historyOf(ids.studentLoan)).toEqual([-41000, -41500]);
      });

      it("is safe on an empty database", async () => {
        await ds.runMigrations();
        expect(await applied()).toContain(MIGRATION_NAME);
        expect(await wrongSignRows()).toBe(0);
      });

      it("down() restores the recorded old signs, except values changed since, and drops the checks", async () => {
        await migrateToBeforeRule();
        const ids = await seedMixedSigns();
        await ds.runMigrations();
        // The user edits the card after deploy: their value is kept on rollback.
        await ds.query("UPDATE accounts SET balance = -650 WHERE id = $1", [ids.card]);

        while ((await applied()).includes(MIGRATION_NAME)) await ds.undoLastMigration();

        expect(await balanceOf(ids.card)).toBe(-650);
        expect(await balanceOf(ids.studentLoan)).toBe(42000);
        expect(await historyOf(ids.card)).toEqual([450, -480]);
        expect(await historyOf(ids.studentLoan)).toEqual([41000, 41500]);
        expect(await balanceOf(ids.mortgage)).toBe(-200000);
        const [{ exists }] = await ds.query("SELECT to_regclass($1) IS NOT NULL AS exists", [
          `public.${BEFORE_IMAGE_TABLE}`,
        ]);
        expect(exists).toBe(false);
        // The checks are gone with it.
        await expect(insertAccount("Credit Card", 10)).resolves.toBeTypeOf("string");
      });

      it("deletes an account's before-image rows with the account", async () => {
        await migrateToBeforeRule();
        const ids = await seedMixedSigns();
        await ds.runMigrations();
        await ds.query("DELETE FROM account_details WHERE account_id = $1", [ids.studentLoan]);
        await ds.query("DELETE FROM accounts WHERE id = $1", [ids.studentLoan]);
        const [{ n }] = await ds.query(
          `SELECT count(*)::int AS n FROM ${BEFORE_IMAGE_TABLE} WHERE account_id = $1`,
          [ids.studentLoan],
        );
        expect(n).toBe(0);
      });
    });

    describe("database checks", () => {
      beforeEach(async () => {
        await ds.runMigrations();
      });

      it("rejects a positive liability balance on insert and update", async () => {
        for (const type of STORED_NEGATIVE_ACCOUNT_TYPES) {
          await expect(insertAccount(type, 1)).rejects.toThrow(
            /CHK_accounts_liability_balance_non_positive/,
          );
        }
        const card = await insertAccount("Credit Card", -1);
        await expect(
          ds.query("UPDATE accounts SET balance = 1 WHERE id = $1", [card]),
        ).rejects.toThrow(/CHK_accounts_liability_balance_non_positive/);
        // Assets keep any sign.
        await expect(insertAccount("Current", -1)).resolves.toBeTypeOf("string");
        await expect(insertAccount("Saving", 1)).resolves.toBeTypeOf("string");
      });

      it("rejects a positive liability history value, checked at commit", async () => {
        const card = await insertAccount("Credit Card", -100);
        await expect(insertDetail(card, 10, 100)).rejects.toThrow(/liability history/);
        const row = await insertDetail(card, 10, -100);
        await expect(
          ds.query("UPDATE account_details SET value = 5 WHERE id = $1", [row]),
        ).rejects.toThrow(/liability history/);
        const saving = await insertAccount("Saving", 100);
        await expect(insertDetail(saving, 10, 100)).resolves.toBeTypeOf("number");
      });

      it("rejects a type change to a liability while history is positive, in either order inside a transaction", async () => {
        const acc = await insertAccount("Saving", -100);
        await insertDetail(acc, 10, 100);
        await expect(
          ds.query("UPDATE accounts SET type = 'Loan' WHERE id = $1", [acc]),
        ).rejects.toThrow(/liability history/);

        // Type first, then history: the deferred check sees the final state and passes.
        await inTransaction(async (qr) => {
          await qr.query("UPDATE accounts SET type = 'Loan' WHERE id = $1", [acc]);
          await qr.query("UPDATE account_details SET value = -value WHERE account_id = $1", [acc]);
        });
        expect(await historyOf(acc)).toEqual([-100]);
      });
    });

    describe("every write path stores a liability negative", { timeout: 60_000 }, () => {
      beforeEach(async () => {
        await ds.runMigrations();
      });

      it("POST /accounts (createAccount), for every type and signed value", async () => {
        const svc = intake();
        for (const type of ALL_TYPES) {
          for (const value of VALUES) {
            const created = await svc.createAccount(USER, {
              name: "A",
              type,
              balance: value,
            } as never);
            expect(await balanceOf(created.id), `${type} ${value}`).toBe(expected(type, value));
          }
        }
        expect(await wrongSignRows()).toBe(0);
      });

      it("PATCH /accounts/:id balance edit and the check-in batch, with their history rows", async () => {
        const svc = intake();
        for (const type of ALL_TYPES) {
          const id = await insertAccount(type, 0);
          for (const value of VALUES) {
            await svc.updateAccount(USER, id, { balance: value } as never);
            expect(await balanceOf(id), `${type} ${value}`).toBe(expected(type, value));
            await svc.updateBalances(USER, { balances: [{ id, balance: value }] } as never);
            expect(await balanceOf(id), `${type} ${value}`).toBe(expected(type, value));
            expect((await historyOf(id)).at(-1)).toBe(expected(type, value));
          }
        }
        expect(await wrongSignRows()).toBe(0);
      });

      it("PATCH /accounts/:id type change re-signs the balance and the whole history", async () => {
        const svc = intake();
        const id = await insertAccount("Saving", 800);
        await insertDetail(id, 8, 700);
        await insertDetail(id, 9, -5);
        await svc.updateAccount(USER, id, { type: "Credit Card" } as never);
        expect(await balanceOf(id)).toBe(-800);
        expect(await historyOf(id)).toEqual([-700, -5]);

        // A liability that becomes an asset keeps its values as they are.
        await svc.updateAccount(USER, id, { type: "Current" } as never);
        expect(await balanceOf(id)).toBe(-800);
        expect(await historyOf(id)).toEqual([-700, -5]);

        // Type and balance together: the balance follows the new type.
        await svc.updateAccount(USER, id, { type: "Student Loan", balance: 30000 } as never);
        expect(await balanceOf(id)).toBe(-30000);
        expect(await wrongSignRows()).toBe(0);
      });

      it("PUT /snapshots/:month, past and current month", async () => {
        const svc = new SnapshotsService(ds);
        for (const type of ALL_TYPES) {
          const id = await insertAccount(type, 0);
          for (const value of VALUES) {
            await svc.upsertMonth(USER, "2026-10", { values: [{ accountId: id, value }] }, NOW);
            await svc.upsertMonth(USER, "2026-11", { values: [{ accountId: id, value }] }, NOW);
            expect(await historyOf(id), `${type} ${value}`).toEqual([
              expected(type, value),
              expected(type, value),
            ]);
            expect(await balanceOf(id)).toBe(expected(type, value));
          }
        }
        expect(await wrongSignRows()).toBe(0);
      });

      it("the onboarding snapshot", async () => {
        const card = await insertAccount("Credit Card", -250);
        const saving = await insertAccount("Saving", 900);
        await writeOnboardingSnapshot(
          ds.getRepository(Account),
          ds.getRepository(AccountDetail),
          USER,
          NOW,
        );
        expect(await historyOf(card)).toEqual([-250]);
        expect(await historyOf(saving)).toEqual([900]);
      });

      it("staged import commit, for new and mapped accounts", async () => {
        const svc = new ImportsService(ds);
        const mapped = await insertAccount("Mortgage", -1000);
        const types = ALL_TYPES.filter((t) => t !== "Property");
        const staged = await svc.stage(
          USER,
          {
            idempotencyKey: "be05-commit-1",
            accounts: [
              ...types.map((type, i) => ({ ref: `r${i}`, name: `A${i}`, type })),
              { ref: "mapped", name: "Home loan", type: "Mortgage" },
            ],
            balances: [
              ...types.flatMap((_, i) => [
                { accountRef: `r${i}`, month: "2026-09", value: 300 },
                { accountRef: `r${i}`, month: "2026-10", value: -400 },
              ]),
              { accountRef: "mapped", month: "2026-10", value: 1200 },
            ],
          },
          NOW,
        );
        await svc.commit(USER, staged.batchId, { accountMap: { mapped } }, NOW);

        const rows: Array<{ type: string; balance: string; values: string[] }> = await ds.query(
          `SELECT a.type, a.balance, array_agg(d.value ORDER BY d.year, d.month) AS values
         FROM accounts a JOIN account_details d ON d.account_id::text = a.id::text
         WHERE a.user_id = $1 GROUP BY a.id, a.type, a.balance`,
          [USER],
        );
        for (const r of rows) {
          if (r.type === "Mortgage" && r.values.length === 1) {
            expect(r.values.map(Number)).toEqual([-1200]);
            continue;
          }
          expect(r.values.map(Number), r.type).toEqual([
            expected(r.type, 300),
            expected(r.type, -400),
          ]);
          expect(Number(r.balance), r.type).toBe(expected(r.type, -400));
        }
        expect(await wrongSignRows()).toBe(0);
      });

      it("bank sync, for a new account and for a provider that reclassifies an account", async () => {
        const connection = await ds.getRepository(BankConnection).save(
          ds.getRepository(BankConnection).create({
            userId: USER,
            institutionId: "test-bank",
            institutionName: "Test Bank",
            status: "connected",
          } as Partial<BankConnection>),
        );
        await ds.getRepository(BankConnection).update(connection.id, {
          accessToken: BankSyncOrchestrator.encryptToken("token", accessTokenAad(connection.id)),
        });
        let provided = [
          {
            externalAccountId: "ext-1",
            name: "Card",
            type: "Credit Card",
            balance: 640,
            currency: "GBP",
          },
          {
            externalAccountId: "ext-2",
            name: "Flex",
            type: "Saving",
            balance: 120,
            currency: "GBP",
          },
        ];
        const registry = {
          getProvider: () => ({ fetchAccounts: async () => provided }) as unknown as BankProvider,
        } as unknown as BankProviderRegistry;
        const finance = new FinanceService(
          ds.getRepository(Account),
          ds.getRepository(Transaction),
          ds.getRepository(AccountDetail),
          ds.getRepository(BankConnection),
          ds.getRepository(UserProfile),
          registry,
          { get: () => undefined } as unknown as ConfigService,
        );
        await finance.syncBankConnection(USER, connection.id);
        const byExt = async (ext: string) =>
          (await ds.query("SELECT id FROM accounts WHERE external_account_id = $1", [ext]))[0].id;
        const card = await byExt("ext-1");
        const flex = await byExt("ext-2");
        expect(await balanceOf(card)).toBe(-640);
        expect(await historyOf(card)).toEqual([-640]);
        expect(await balanceOf(flex)).toBe(120);

        // The provider now reports the saver as an overdraft: balance and history follow.
        await ds.query("UPDATE account_details SET source = 'manual' WHERE account_id = $1", [
          flex,
        ]);
        provided = [{ ...provided[1], type: "Overdraft", balance: 130 }];
        await finance.syncBankConnection(USER, connection.id);
        expect(await balanceOf(flex)).toBe(-120);
        expect(await historyOf(flex)).toEqual([-120]);
        expect(await wrongSignRows()).toBe(0);
      });
    });

    it("import revert restores a prior value recorded before the backfill with the rule applied", async () => {
      // The import service needs the uuid account_id of AccountIdForeignKeys1794358200000, so the
      // batch is committed on the current schema and its recorded prior is then set to what a
      // commit before BE-05 recorded: the card's old positive October value.
      await ds.runMigrations();
      const card = await insertAccount("Credit Card", -700);
      await insertDetail(card, 10, -700);
      const svc = new ImportsService(ds);
      const staged = await svc.stage(
        USER,
        {
          idempotencyKey: "be05-revert-1",
          accounts: [{ ref: "card", name: "Card", type: "Credit Card" }],
          balances: [{ accountRef: "card", month: "2026-10", value: 720 }],
        },
        NOW,
      );
      await svc.commit(
        USER,
        staged.batchId,
        { accountMap: { card }, overwriteManual: ["card:2026-10"] },
        NOW,
      );
      expect(await historyOf(card)).toEqual([-720]);
      await ds.query(
        `UPDATE import_batches
         SET revert_data = jsonb_set(revert_data, '{rows,0,prior,value}', '700'::jsonb)
         WHERE id = $1`,
        [staged.batchId],
      );
      const [{ prior }] = await ds.query(
        "SELECT (revert_data #>> '{rows,0,prior,value}')::float AS prior FROM import_batches WHERE id = $1",
        [staged.batchId],
      );
      expect(prior).toBe(700);

      await svc.revert(USER, staged.batchId);

      expect(await historyOf(card)).toEqual([-700]);
      expect(await wrongSignRows()).toBe(0);
    });
  },
);
