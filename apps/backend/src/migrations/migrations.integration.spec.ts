import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import {
  DROPPED_PROFILE_COLUMNS,
  PROFILE_COLUMN_DROP_TABLE,
} from "../integrity/profile-column-drop";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../testing/discoverMigrations";
import { at } from "../testing/must";
import {
  AccountDetailsOwnerKey1795510000000,
  OWNER_KEY,
} from "./AccountDetailsOwnerKey1795510000000";
import { AccountDetailsUserMonthIndex1794357300000 } from "./AccountDetailsUserMonthIndex1794357300000";
import {
  ACCOUNT_TYPE_CHECK,
  ACCOUNT_TYPE_SKIPPED,
  ACCOUNT_TYPES_AT_1795510100000,
  AccountTypeCheck1795510100000,
} from "./AccountTypeCheck1795510100000";
import { AddAccountDeletionTombstones1794622492000 } from "./AddAccountDeletionTombstones1794622492000";
import { AddAccountLinkAndRepaymentType1795470000000 } from "./AddAccountLinkAndRepaymentType1795470000000";
import { AddAccountStudentLoanPlanAndCurrencyDefault1794355800000 } from "./AddAccountStudentLoanPlanAndCurrencyDefault1794355800000";
import {
  AddAccountSubtypeCreditLimitAndPromo1795300000000,
  DOWN_REFUSAL as SUBTYPE_DOWN_REFUSAL,
} from "./AddAccountSubtypeCreditLimitAndPromo1795300000000";
import {
  AddBudgetEntryJointShare1795350000000,
  BUDGET_JOINT_DOWN_REFUSAL,
} from "./AddBudgetEntryJointShare1795350000000";
import {
  AddBudgetEntryLinkKind1795440000000,
  LINK_KIND_DOWN_REFUSAL,
} from "./AddBudgetEntryLinkKind1795440000000";
import { AddLivingWithFamilyHousingStatus1794700000000 } from "./AddLivingWithFamilyHousingStatus1794700000000";
import { AddMortgageTermColumns1794355600000 } from "./AddMortgageTermColumns1794355600000";
import { AddNetWorthChoices1794800000000 } from "./AddNetWorthChoices1794800000000";
import { AddProfileFacts1794355723000 } from "./AddProfileFacts1794355723000";
import { AddRateLimitBuckets1794632012000 } from "./AddRateLimitBuckets1794632012000";
import { AddUserIdIndexes1794358100000, USER_ID_INDEXES } from "./AddUserIdIndexes1794358100000";
import { AuditActionUserExported1795000000000 } from "./AuditActionUserExported1795000000000";
import { AuditEventsDeleteAndTruncateGuards1795100000000 } from "./AuditEventsDeleteAndTruncateGuards1795100000000";
import { BackfillAnnualTaxRecordEndDate1794355900000 } from "./BackfillAnnualTaxRecordEndDate1794355900000";
import { BackfillFirstHistoryRow1795470300000 } from "./BackfillFirstHistoryRow1795470300000";
import { BackfillMortgageRepaymentType1795530000000 } from "./BackfillMortgageRepaymentType1795530000000";
import { BackfillPropertyKindAndMortgageLink1795470100000 } from "./BackfillPropertyKindAndMortgageLink1795470100000";
import { Baseline1794355200000 } from "./Baseline1794355200000";
import { ClearBankTokens1794355300000 } from "./ClearBankTokens1794355300000";
import {
  ClearDefaultPensionRates1795480100000,
  PENSION_DEFAULTS_CLEAR_BEFORE,
} from "./ClearDefaultPensionRates1795480100000";
import { ClearResetPensionZeros1795530200000 } from "./ClearResetPensionZeros1795530200000";
import {
  ClearTakeHomeSalaries1795530100000,
  TAKE_HOME_SALARY_CLEAR_BEFORE,
} from "./ClearTakeHomeSalaries1795530100000";
import { ClearUnchosenSectionOrder1795500000000 } from "./ClearUnchosenSectionOrder1795500000000";
import { DeleteSyncedTransactions1794355500000 } from "./DeleteSyncedTransactions1794355500000";
import { LinkBudgetLinesToAccounts1795490000000 } from "./LinkBudgetLinesToAccounts1795490000000";
import { MoveBuyToLetProfileIntoAccounts1795470200000 } from "./MoveBuyToLetProfileIntoAccounts1795470200000";
import { PensionAnswersNullable1795480000000 } from "./PensionAnswersNullable1795480000000";
import { RemovePayeSalaryRecords1795480300000 } from "./RemovePayeSalaryRecords1795480300000";
import {
  RemoveSeededExampleData1794355400000,
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  TAX_FINGERPRINT_SQL,
} from "./RemoveSeededExampleData1794355400000";
import {
  RENTAL_SHARE_BACKFILL_TABLE,
  RentalShareOntoPropertyAccounts1795540100000,
} from "./RentalShareOntoPropertyAccounts1795540100000";
import { RentLinesWholeRent1795490100000 } from "./RentLinesWholeRent1795490100000";
import { SavingsRowsNotEssential1795450000000 } from "./SavingsRowsNotEssential1795450000000";
import { SetupChecklistDismissed1795500100000 } from "./SetupChecklistDismissed1795500100000";
import { StudentLoanPlanToProfile1795480200000 } from "./StudentLoanPlanToProfile1795480200000";
import {
  TAX_RECORD_ACCOUNT_FOREIGN_KEY,
  TAX_RECORD_ACCOUNT_USER_INDEX,
  TAX_RECORD_USER_ACCOUNT_INDEX,
  TaxRecordAccountLink1795540000000,
} from "./TaxRecordAccountLink1795540000000";
import { UniqueAccountDetailMonth1794356000000 } from "./UniqueAccountDetailMonth1794356000000";
import { WidenPensionPercentPrecision1795460000000 } from "./WidenPensionPercentPrecision1795460000000";

// These tests DROP the public schema. Run them against a throwaway database only:
//   docker run --rm -d --name flump-e3-pg -e POSTGRES_PASSWORD=postgres \
//     -e POSTGRES_DB=flump_e3_test -p 55432:5432 postgres:18-alpine
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/migrations
// Skipped when TEST_DATABASE_URL is unset, unless REQUIRE_DB_TESTS=1 (CI), in which
// case collection fails instead. Throws if the URL points at anything unsafe.
// CI runs this suite against the Postgres 18 service container in the vitest job
// (.github/workflows/ci-pipeline.yml); turbo.json passes the variables through.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// Discovered from src/migrations (shared with the contract test) so a new migration is never skipped.
let MIGRATIONS: MigrationClass[] = [];

// Operational tables a migration creates that no entity maps (left out of the entity
// comparisons): the BE-05 liability sign before-image (LiabilitySignRule1794358050000) and the
// BE-07 shared rate-limit counters (AddRateLimitBuckets1794632012000), the three slice 6
// before-images (ClearDefaultPensionRates, StudentLoanPlanToProfile, RemovePayeSalaryRecords) and
// the slice 4 before-image (account_home_backfill, BackfillPropertyKindAndMortgageLink1795470100000)
// and its later repeat for repayment types (mortgage_repayment_type_backfill,
// BackfillMortgageRepaymentType1795530000000), the slice 9 column-drop before-image
// (profile_column_drop_backfill, profile-column-drop.ts), and the profile before-images of
// ClearTakeHomeSalaries1795530100000 and ClearResetPensionZeros1795530200000, and the slice 7
// before-image (rental_share_onto_property_backfill, RentalShareOntoPropertyAccounts1795550100000).
const MIGRATION_ONLY_TABLES =
  "'migrations', 'liability_sign_backfill', 'rate_limit_buckets', 'pension_rates_backfill', 'student_loan_plan_backfill', 'paye_salary_record_backfill', 'account_home_backfill', 'rent_share_backfill', 'mortgage_repayment_type_backfill', 'profile_column_drop_backfill', 'take_home_salary_backfill', 'reset_pension_zeros_backfill', 'rental_share_onto_property_backfill'";

const ENTITY_TABLES = [
  "account_deletion_tombstones",
  "account_details",
  "accounts",
  "agent_audit_events",
  "audit_events",
  "bank_connections",
  "bank_oauth_states",
  "budget_entries",
  "consents",
  "idempotency_keys",
  "import_batches",
  "mcp_tokens",
  "retirement_plans",
  "snapshot_checkins",
  "tax_records",
  "transactions",
  "user_profiles",
];

describe.skipIf(resolveDbTestMode(process.env) === "skip")("migrations (real Postgres)", () => {
  let ds: DataSource;

  beforeAll(async () => {
    MIGRATIONS = await discoverMigrations();
  });

  beforeEach(async () => {
    // Before any connection or schema drop.
    assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);

    const options = typeOrmOptionsFromEnv({
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
    }) as DataSourceOptions;
    // Migration classes are passed directly: TypeORM's glob loader uses native import,
    // which cannot parse .ts under vitest (the glob is exercised by the compiled dist).
    ds = new DataSource({
      ...options,
      migrations: MIGRATIONS,
      synchronize: false,
      migrationsRun: false,
    });
    await ds.initialize();
    await resetSchema();
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  // Dropping the schema removes the extension TypeORM installs on connect.
  const resetSchema = async (): Promise<void> => {
    await ds.query("DROP SCHEMA public CASCADE");
    await ds.query("CREATE SCHEMA public");
    await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  };

  const tables = async (): Promise<string[]> => {
    const rows: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN (${MIGRATION_ONLY_TABLES}) ORDER BY table_name`,
    );
    return rows.map((r) => r.table_name);
  };

  const columns = (): Promise<unknown[]> =>
    ds.query(
      `SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name NOT IN (${MIGRATION_ONLY_TABLES}) ORDER BY table_name, column_name`,
    );

  // Names, types and nullability per column, plus PRIMARY KEY / UNIQUE column sets.
  const shape = async (): Promise<unknown> => ({
    columns: await ds.query(
      `SELECT table_name, column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name NOT IN (${MIGRATION_ONLY_TABLES}) ORDER BY table_name, column_name`,
    ),
    constraints: await ds.query(
      `SELECT tc.table_name, tc.constraint_type, array_agg(kcu.column_name::text ORDER BY kcu.column_name) AS cols
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public' AND tc.table_name NOT IN (${MIGRATION_ONLY_TABLES})
         AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
       GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
       ORDER BY tc.table_name, tc.constraint_type, cols`,
    ),
  });

  const applied = async (): Promise<string[]> => {
    const rows: { name: string }[] = await ds.query("SELECT name FROM migrations ORDER BY id");
    return rows.map((r) => r.name);
  };

  // Undoes migrations newest first until `name` itself has been undone.
  const undoThrough = async (name: string): Promise<void> => {
    while ((await applied()).includes(name)) await ds.undoLastMigration();
  };

  const insertConnections = (rows: [string, string, string | null][]): Promise<unknown> =>
    ds.query(
      `INSERT INTO bank_connections (user_id, institution_id, institution_name, access_token, refresh_token, status)
       VALUES ${rows.map((_, i) => `($${i * 3 + 1}, 'i', 'Bank', $${i * 3 + 2}, $${i * 3 + 2}, $${i * 3 + 3})`).join(", ")}`,
      rows.flat(),
    );

  // Runs a migration body the way TypeORM does: inside its own transaction.
  const runUpInTransaction = async (migration: {
    up: (qr: import("typeorm").QueryRunner) => Promise<void>;
  }): Promise<void> => {
    const runner = ds.createQueryRunner();
    try {
      await runner.startTransaction();
      await migration.up(runner);
      await runner.commitTransaction();
    } finally {
      await runner.release();
    }
  };

  const runMigrationDown = async (migration: {
    down: (qr: import("typeorm").QueryRunner) => Promise<void>;
  }): Promise<void> => {
    const runner = ds.createQueryRunner();
    try {
      await runner.startTransaction();
      await migration.down(runner);
      await runner.commitTransaction();
    } finally {
      await runner.release();
    }
  };

  it("creates all twelve tables on an empty database", async () => {
    await ds.runMigrations();
    expect(await tables()).toEqual(ENTITY_TABLES);
  });

  it("is idempotent: a second run changes nothing and records each migration once", async () => {
    await ds.runMigrations();
    const before = await columns();
    const second = await ds.runMigrations();
    expect(second).toEqual([]);
    expect(await columns()).toEqual(before);
    expect(await applied()).toEqual(MIGRATIONS.map((m) => m.name));
  });

  it("leaves a synchronize-built database unchanged and records the baseline as applied", async () => {
    await ds.synchronize();
    await ds.query(
      "INSERT INTO user_profiles (user_id, display_name) VALUES ('user-1', 'Keep me')",
    );
    const before = await columns();

    await ds.runMigrations();

    expect(await columns()).toEqual(before);
    expect(await ds.query("SELECT display_name FROM user_profiles")).toEqual([
      { display_name: "Keep me" },
    ]);
    expect(await applied()).toContain("Baseline1794355200000");
  });

  it("builds the same schema as synchronize (no DDL drift against the entities)", async () => {
    await ds.runMigrations();
    const fromBaseline = await shape();

    await resetSchema();
    await ds.synchronize();
    const fromSynchronize = await shape();

    expect(fromBaseline).toEqual(fromSynchronize);
  });

  it("refuses to half-create the schema when only some tables exist", async () => {
    await ds.query('CREATE TABLE "user_profiles" ("id" uuid PRIMARY KEY)');
    await expect(ds.runMigrations()).rejects.toThrow(/partial/i);
    expect(await tables()).toEqual(["user_profiles"]);
  });

  it("clears tokens on every connection and keeps disconnected ones disconnected", async () => {
    await ds.runMigrations();
    // Re-open the window: forget the clear migration so it runs against seeded rows.
    await ds.query("DELETE FROM migrations WHERE name = 'ClearBankTokens1794355300000'");
    await insertConnections([
      ["u1", "tok-a", "connected"],
      ["u2", "tok-b", "error"],
      ["u3", "tok-c", "disconnected"],
    ]);

    await ds.runMigrations();

    const rows = await ds.query(
      "SELECT user_id, access_token, refresh_token, status FROM bank_connections ORDER BY user_id",
    );
    expect(rows).toEqual([
      { user_id: "u1", access_token: null, refresh_token: null, status: "error" },
      { user_id: "u2", access_token: null, refresh_token: null, status: "error" },
      { user_id: "u3", access_token: null, refresh_token: null, status: "disconnected" },
    ]);
  });

  it("succeeds with zero bank connections", async () => {
    await expect(ds.runMigrations()).resolves.toHaveLength(MIGRATIONS.length);
    expect(await ds.query("SELECT count(*)::int AS n FROM bank_connections")).toEqual([{ n: 0 }]);
  });

  it("runs the token clear once: a second instance does not wipe a reconnected token", async () => {
    await ds.runMigrations();
    expect(await applied()).toContain("ClearBankTokens1794355300000");

    // A user reconnects after the first instance cleared tokens.
    await insertConnections([["u1", "fresh-token", "connected"]]);

    // The second instance still had the migration in its pending list and now runs the body.
    await runUpInTransaction(new ClearBankTokens1794355300000());

    expect(await ds.query("SELECT access_token, status FROM bank_connections")).toEqual([
      { access_token: "fresh-token", status: "connected" },
    ]);
  });

  it("clears tokens when the migration is not yet recorded (migrations table absent)", async () => {
    await runUpInTransaction(new Baseline1794355200000());
    await insertConnections([["u1", "tok", "connected"]]);

    await runUpInTransaction(new ClearBankTokens1794355300000());

    expect(await ds.query("SELECT access_token, status FROM bank_connections")).toEqual([
      { access_token: null, status: "error" },
    ]);
  });
  describe("RemoveSeededExampleData1794355400000", () => {
    const MIGRATION = "RemoveSeededExampleData1794355400000";

    const insertTax = async (
      userId: string,
      name: string,
      amount: string,
      endDate: string | null = "2021-03-31",
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date, end_date)
         VALUES ($1, 'income', 'rental', 'rental_income', $2, $3, 'monthly', '2020-12-01', $4)
         RETURNING id`,
        [userId, name, amount, endDate],
      );
      return at(rows, 0).id;
    };

    const fingerprintOf = async (id: string): Promise<string> => {
      const rows: { fp: string }[] = await ds.query(
        `SELECT ${TAX_FINGERPRINT_SQL} AS fp FROM tax_records WHERE id = $1`,
        [id],
      );
      return at(rows, 0).fp;
    };

    const insertAccount = async (
      userId: string,
      seed: (typeof SEEDED_ACCOUNTS)[number],
      overrides: { balance?: number; connectionId?: string } = {},
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, interest_rate, monthly_contribution, is_current, currency, connection_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'GBP', $8) RETURNING id`,
        [
          userId,
          seed.name,
          seed.type,
          overrides.balance ?? seed.balance,
          seed.interestRate,
          seed.monthlyContribution,
          seed.isCurrent,
          overrides.connectionId ?? null,
        ],
      );
      return at(rows, 0).id;
    };

    const insertSeedAccounts = (userId: string): Promise<string[]> =>
      Promise.all(SEEDED_ACCOUNTS.map((a) => insertAccount(userId, a)));

    const insertBudget = async (
      userId: string,
      seed: (typeof SEEDED_BUDGET_ENTRIES)[number],
      isDefault = true,
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, frequency, is_income, is_primary_income, is_essential, is_default)
         VALUES ($1, $2, $3, $4, 'monthly', $5, $6, $7, $8) RETURNING id`,
        [
          userId,
          seed.category,
          seed.name,
          seed.amount,
          seed.isIncome,
          seed.isPrimaryIncome,
          seed.isEssential,
          isDefault,
        ],
      );
      return at(rows, 0).id;
    };

    // Brings the database to the state just before this migration ran in production.
    const prepare = async (): Promise<void> => {
      await ds.runMigrations();
      await ds.query("DELETE FROM migrations WHERE name = $1", [MIGRATION]);
    };

    const ids = async (table: string): Promise<string[]> => {
      const rows: { id: string }[] = await ds.query(`SELECT id::text AS id FROM ${table}`);
      return rows.map((r) => r.id).sort();
    };

    it("deletes rows whose fingerprint is listed and keeps edited ones", async () => {
      await prepare();
      const seeded = await insertTax("u1", "Generic Rent", "1000.00");
      const seededNoEnd = await insertTax("u2", "Generic Rent", "1000.00", null);
      const editedAmount = await insertTax("u1", "Generic Rent", "1000.00");
      const editedEnd = await insertTax("u1", "Generic Rent", "1000.00");
      const fingerprints = [await fingerprintOf(seeded), await fingerprintOf(seededNoEnd)];
      await ds.query("UPDATE tax_records SET amount = 1000.01 WHERE id = $1", [editedAmount]);
      await ds.query("UPDATE tax_records SET end_date = '2021-02-28' WHERE id = $1", [editedEnd]);

      await runUpInTransaction(new RemoveSeededExampleData1794355400000(fingerprints));

      expect(await ids("tax_records")).toEqual([editedAmount, editedEnd].sort());
    });

    it("matches the fingerprint format against rows with fractional amounts and no end date", async () => {
      await prepare();
      const id = await insertTax("u1", "Generic Fee", "46.22", null);
      const expected: { fp: string }[] = await ds.query(
        `SELECT md5('Generic Fee|46.22|2020-12-01|monthly|rental_income|rental|') AS fp`,
      );
      expect(await fingerprintOf(id)).toBe(at(expected, 0).fp);
    });

    it("deletes untouched seed accounts and keeps edited, connected and populated ones", async () => {
      await prepare();
      const [checking, , , pension] = await insertSeedAccounts("u1");
      const changedBalance = await insertAccount("u2", at(SEEDED_ACCOUNTS, 0), {
        balance: 2450.76,
      });
      const connections: { id: string }[] = await ds.query(
        `INSERT INTO bank_connections (user_id, institution_id, institution_name) VALUES ('u3', 'i', 'Bank') RETURNING id`,
      );
      const connected = await insertAccount("u3", at(SEEDED_ACCOUNTS, 0), {
        connectionId: at(connections, 0).id,
      });
      const withDetails = await insertAccount("u4", at(SEEDED_ACCOUNTS, 1));
      await ds.query(
        "INSERT INTO account_details (account_id, user_id, month, year, value, as_of_date) VALUES ($1, 'u4', 1, 2024, 5, '2024-01-31')",
        [withDetails],
      );
      const withTransactions = await insertAccount("u5", at(SEEDED_ACCOUNTS, 2));
      await ds.query(
        `INSERT INTO transactions (account_id, user_id, amount, description, category) VALUES ($1, 'u5', 1, 'x', 'y')`,
        [withTransactions],
      );

      await runUpInTransaction(new RemoveSeededExampleData1794355400000([]));

      const remaining = await ids("accounts");
      expect(remaining).toEqual([changedBalance, connected, withDetails, withTransactions].sort());
      expect(remaining).not.toContain(checking);
      expect(remaining).not.toContain(pension);
    });

    it("deletes both copies of a race-duplicated seed set", async () => {
      await prepare();
      await insertSeedAccounts("u1");
      await insertSeedAccounts("u1");
      for (const entry of SEEDED_BUDGET_ENTRIES) {
        await insertBudget("u1", entry);
        await insertBudget("u1", entry);
      }

      await runUpInTransaction(new RemoveSeededExampleData1794355400000([]));

      expect(await ids("accounts")).toEqual([]);
      expect(await ids("budget_entries")).toEqual([]);
    });

    it("deletes untouched budget template rows and keeps edited or user-created ones", async () => {
      await prepare();
      const [rent, insurance, electricity, gas] = [
        await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 0)),
        await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 1)),
        await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 2)),
        await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 3)),
      ];
      const salary = await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 14));
      const notDefault = await insertBudget("u1", at(SEEDED_BUDGET_ENTRIES, 4), false);
      await ds.query(
        "UPDATE budget_entries SET amount = 1300, updated_at = now() + interval '1 second' WHERE id = $1",
        [rent],
      );
      await ds.query(
        "UPDATE budget_entries SET updated_at = created_at + interval '1 second' WHERE id = $1",
        [insurance],
      );
      await ds.query("UPDATE budget_entries SET notes = 'mine' WHERE id = $1", [electricity]);

      await runUpInTransaction(new RemoveSeededExampleData1794355400000([]));

      expect(await ids("budget_entries")).toEqual(
        [rent, insurance, electricity, notDefault].sort(),
      );
      expect(await ids("budget_entries")).not.toContain(gas);
      expect(await ids("budget_entries")).not.toContain(salary);
    });

    it("deletes every row of the mock identities and leaves another user's rows", async () => {
      await prepare();
      const tokenInsert = (userId: string, hash: string): Promise<unknown> =>
        ds.query(
          "INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix) VALUES ($1, 'n', $2, 'p')",
          [userId, hash],
        );
      for (const user of ["user_mock", "dev_user_123", "real-user"]) {
        const account = await insertAccount(user, {
          ...at(SEEDED_ACCOUNTS, 0),
          name: `Custom ${user}`,
        });
        await ds.query(
          "INSERT INTO account_details (account_id, user_id, month, year, value, as_of_date) VALUES ($1, $2, 1, 2024, 5, '2024-01-31')",
          [account, user],
        );
        await ds.query(
          `INSERT INTO transactions (account_id, user_id, amount, description, category) VALUES ($1, $2, 1, 'x', 'y')`,
          [account, user],
        );
        await insertConnections([[user, "tok", "connected"]]);
        await insertBudget(user, at(SEEDED_BUDGET_ENTRIES, 0), false);
        await insertTax(user, "Custom", "5.00");
        await tokenInsert(user, `hash-${user}`);
        await ds.query("INSERT INTO user_profiles (user_id) VALUES ($1)", [user]);
      }

      await runUpInTransaction(new RemoveSeededExampleData1794355400000([]));

      for (const table of [
        "accounts",
        "bank_connections",
        "budget_entries",
        "mcp_tokens",
        "tax_records",
        "transactions",
        "user_profiles",
      ]) {
        expect(await ds.query(`SELECT user_id FROM ${table} ORDER BY user_id`), table).toEqual([
          { user_id: "real-user" },
        ]);
      }
      expect(await ds.query("SELECT count(*)::int AS n FROM account_details")).toEqual([{ n: 1 }]);
    });

    it("changes nothing on a second run", async () => {
      await prepare();
      const kept = await insertTax("u1", "Keep", "9.00");
      const gone = await insertTax("u1", "Gone", "9.00");
      const fingerprints = [await fingerprintOf(gone)];
      await insertSeedAccounts("u1");
      await runUpInTransaction(new RemoveSeededExampleData1794355400000(fingerprints));
      await ds.query("DELETE FROM migrations WHERE name = $1", [MIGRATION]);
      // Rows created after the first run, matching the seed shapes again.
      const lateAccount = await insertAccount("u2", at(SEEDED_ACCOUNTS, 0));
      await ds.query("INSERT INTO migrations (timestamp, name) VALUES (1794355400000, $1)", [
        MIGRATION,
      ]);

      await runUpInTransaction(new RemoveSeededExampleData1794355400000(fingerprints));

      expect(await ids("tax_records")).toEqual([kept]);
      expect(await ids("accounts")).toEqual([lateAccount]);
    });

    it("succeeds with zero rows in every table", async () => {
      await expect(ds.runMigrations()).resolves.toHaveLength(MIGRATIONS.length);
      expect(await applied()).toContain(MIGRATION);
    });

    it("runs against the real fingerprint list without touching unrelated rows", async () => {
      await prepare();
      const kept = await insertTax("u1", "Unrelated expense", "12.34");

      await runUpInTransaction(new RemoveSeededExampleData1794355400000());

      expect(await ids("tax_records")).toEqual([kept]);
    });
  });

  describe("EvolveAccountDetailsForSnapshots1794356100000 (E30)", () => {
    const MIGRATION = "EvolveAccountDetailsForSnapshots1794356100000";

    // Brings the schema to the state before this migration (full up, then the downs back to and
    // including its own), so the legacy shape can be seeded and the real up() run on top of it.
    const legacy = async (): Promise<{ a: string; b: string }> => {
      await ds.runMigrations();
      await undoThrough(MIGRATION);
      // Back to before E23's unique index too, so legacy duplicate rows can be seeded.
      await ds.query('DROP INDEX IF EXISTS "UQ_account_details_account_year_month"');
      await ds.query("DELETE FROM migrations WHERE name = 'UniqueAccountDetailMonth1794356000000'");
      const acc = async (user: string): Promise<string> => {
        const rows: { id: string }[] = await ds.query(
          `INSERT INTO accounts (user_id, name, type, balance, currency)
           VALUES ($1, 'Acc', 'Current', 10, 'GBP') RETURNING id`,
          [user],
        );
        return at(rows, 0).id;
      };
      return { a: await acc("user-a"), b: await acc("user-b") };
    };
    const legacyRow = (account: string, year: number, month: number, value: number) =>
      ds.query(
        "INSERT INTO account_details (account_id, month, year, value) VALUES ($1, $2, $3, $4)",
        [account, month, year, value],
      );

    it("down() removes the new columns, constraints and table", async () => {
      await ds.runMigrations();
      await undoThrough(MIGRATION);
      expect(await tables()).not.toContain("snapshot_checkins");
      const cols: { column_name: string }[] = await ds.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'account_details'",
      );
      expect(cols.map((c) => c.column_name).sort()).toEqual([
        "account_id",
        "id",
        "month",
        "value",
        "year",
      ]);
    });

    it("keeps the latest write per account and month, drops orphans, backfills owner and date", async () => {
      const { a, b } = await legacy();
      await legacyRow(a, 2026, 1, 100); // older duplicate
      await legacyRow(a, 2026, 1, 150); // latest write wins
      await legacyRow(a, 2026, 2, 200);
      await legacyRow(b, 2026, 2, 300);
      await legacyRow("00000000-0000-0000-0000-000000000000", 2026, 2, 999); // orphan
      await legacyRow(a, 2026, 14, 1); // impossible month
      await legacyRow(a, 2999, 1, 1); // future month

      await ds.runMigrations();

      // Rows E30 kept. The later slice 4 migration 4 adds a current-month row to accounts created
      // after their newest record (as these seeded ones are); those rows are its own, tested there.
      const rows = await ds.query(
        `SELECT account_id, user_id, year, month, value::float AS value, as_of_date::text AS as_of_date, source
         FROM account_details
         WHERE id NOT IN (SELECT detail_id FROM account_home_backfill WHERE detail_id IS NOT NULL)
         ORDER BY user_id, year, month`,
      );
      expect(rows).toEqual([
        {
          account_id: a,
          user_id: "user-a",
          year: 2026,
          month: 1,
          value: 150,
          as_of_date: "2026-01-31",
          source: "backfill",
        },
        {
          account_id: a,
          user_id: "user-a",
          year: 2026,
          month: 2,
          value: 200,
          as_of_date: "2026-02-28",
          source: "backfill",
        },
        {
          account_id: b,
          user_id: "user-b",
          year: 2026,
          month: 2,
          value: 300,
          as_of_date: "2026-02-28",
          source: "backfill",
        },
      ]);
      expect(await applied()).toContain(MIGRATION);
    });

    it("enforces the unique key, the month key against as_of_date, and the source list", async () => {
      await ds.runMigrations();
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('user-a', 'Acc', 'Current', 10, 'GBP') RETURNING id`,
      );
      const id = at(rows, 0).id;
      const insert = (year: number, month: number, date: string, source = "manual") =>
        ds.query(
          `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
           VALUES ($1, 'user-a', $2, $3, 1, $4, $5)`,
          [id, year, month, date, source],
        );
      await insert(2026, 3, "2026-03-31");
      await expect(insert(2026, 3, "2026-03-15")).rejects.toThrow(
        /UQ_account_details_account_year_month/,
      );
      await expect(insert(2026, 4, "2026-05-01")).rejects.toThrow(
        /CHK_account_details_as_of_month/,
      );
      await expect(insert(2026, 5, "2026-05-01", "guess")).rejects.toThrow(
        /CHK_account_details_source/,
      );
      await expect(
        ds.query(`INSERT INTO snapshot_checkins (user_id, month) VALUES ('user-a', '2026-13')`),
      ).rejects.toThrow(/CHK_snapshot_checkins_month/);
    });
  });

  describe("DeleteSyncedTransactions1794355500000", () => {
    const MIGRATION = "DeleteSyncedTransactions1794355500000";

    const insertAccountWithTx = async (
      name: string,
      connectionId: string | null,
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency, connection_id)
         VALUES ('u1', $1, 'Current', 10, 'GBP', $2) RETURNING id`,
        [name, connectionId],
      );
      await ds.query(
        `INSERT INTO transactions (account_id, user_id, amount, description, category)
         VALUES ($1, 'u1', -5, $2, 'Food')`,
        [at(rows, 0).id, `tx on ${name}`],
      );
      return at(rows, 0).id;
    };

    const prepare = async (): Promise<string> => {
      await ds.runMigrations();
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      const conn: { id: string }[] = await ds.query(
        `INSERT INTO bank_connections (user_id, institution_id, institution_name, status)
         VALUES ('u1', 'monzo', 'Monzo', 'connected') RETURNING id`,
      );
      return at(conn, 0).id;
    };

    it("deletes transactions on bank-synced accounts and keeps manual ones", async () => {
      const connectionId = await prepare();
      await insertAccountWithTx("Synced", connectionId);
      await insertAccountWithTx("Manual", null);

      await ds.runMigrations();

      expect(await ds.query("SELECT description FROM transactions")).toEqual([
        { description: "tx on Manual" },
      ]);
      expect(await ds.query("SELECT count(*)::int AS n FROM accounts")).toEqual([{ n: 2 }]);
      expect(await applied()).toContain(MIGRATION);
    });

    it("runs once: a second instance does not delete rows added after the first run", async () => {
      const connectionId = await prepare();
      await ds.runMigrations();
      await insertAccountWithTx("Synced", connectionId);

      await runUpInTransaction(new DeleteSyncedTransactions1794355500000());

      expect(await ds.query("SELECT count(*)::int AS n FROM transactions")).toEqual([{ n: 1 }]);
    });

    it("succeeds on an empty database and its down migration is a safe no-op", async () => {
      await expect(ds.runMigrations()).resolves.toHaveLength(MIGRATIONS.length);
      await expect(new DeleteSyncedTransactions1794355500000().down()).resolves.toBeUndefined();
    });
  });

  describe("AddMortgageTermColumns1794355600000", () => {
    const MIGRATION = "AddMortgageTermColumns1794355600000";

    const termColumns = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'accounts'
           AND column_name IN ('term_months', 'fixed_rate_end_date')
         ORDER BY column_name`,
      );

    it("adds nullable integer and date columns and leaves existing rows NULL", async () => {
      await ds.runMigrations();
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      await ds.query('ALTER TABLE "accounts" DROP COLUMN "term_months"');
      await ds.query('ALTER TABLE "accounts" DROP COLUMN "fixed_rate_end_date"');
      await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('u1', 'Home', 'Mortgage', -200000, 'GBP')`,
      );

      await ds.runMigrations();

      expect(await termColumns()).toEqual([
        { column_name: "fixed_rate_end_date", data_type: "date", is_nullable: "YES" },
        { column_name: "term_months", data_type: "integer", is_nullable: "YES" },
      ]);
      expect(await ds.query("SELECT term_months, fixed_rate_end_date FROM accounts")).toEqual([
        { term_months: null, fixed_rate_end_date: null },
      ]);
      expect(await applied()).toContain(MIGRATION);
    });

    it("is idempotent when the columns already exist (synchronize-built database)", async () => {
      await ds.synchronize();
      await expect(runUpInTransaction(new AddMortgageTermColumns1794355600000())).resolves.toBe(
        undefined,
      );
      expect(await termColumns()).toHaveLength(2);
    });

    it("down drops both columns", async () => {
      await ds.runMigrations();
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await new AddMortgageTermColumns1794355600000().down(runner);
        await runner.commitTransaction();
      } finally {
        await runner.release();
      }
      expect(await termColumns()).toEqual([]);
    });
  });

  describe("AddProfileFacts1794355723000", () => {
    const MIGRATION = "AddProfileFacts1794355723000";
    const FACT_COLUMNS = [
      "birth_year",
      "housing_status",
      "monthly_housing_cost",
      "monthly_other_outgoings",
      "student_loan_plans",
      "tax_region",
    ];

    const factColumns = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'user_profiles'
           AND column_name = ANY($1)
         ORDER BY column_name`,
        [FACT_COLUMNS],
      );

    const rerunWithoutColumns = async (): Promise<void> => {
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      for (const column of FACT_COLUMNS) {
        await ds.query(`ALTER TABLE "user_profiles" DROP COLUMN "${column}"`);
      }
    };

    it("adds nullable columns with no default and leaves existing profiles not set", async () => {
      await ds.runMigrations();
      await rerunWithoutColumns();
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('u1')");

      await ds.runMigrations();

      expect(await factColumns()).toEqual([
        {
          column_name: "birth_year",
          data_type: "smallint",
          is_nullable: "YES",
          column_default: null,
        },
        {
          column_name: "housing_status",
          data_type: "character varying",
          is_nullable: "YES",
          column_default: null,
        },
        {
          column_name: "monthly_housing_cost",
          data_type: "numeric",
          is_nullable: "YES",
          column_default: null,
        },
        {
          column_name: "monthly_other_outgoings",
          data_type: "numeric",
          is_nullable: "YES",
          column_default: null,
        },
        {
          column_name: "student_loan_plans",
          data_type: "text",
          is_nullable: "YES",
          column_default: null,
        },
        {
          column_name: "tax_region",
          data_type: "character varying",
          is_nullable: "YES",
          column_default: null,
        },
      ]);
      expect(
        await ds.query("SELECT tax_region, birth_year, student_loan_plans FROM user_profiles"),
      ).toEqual([{ tax_region: null, birth_year: null, student_loan_plans: null }]);
      expect(await applied()).toContain(MIGRATION);
    });

    it("rejects a region or housing status outside the allowed values", async () => {
      await ds.runMigrations();
      await expect(
        ds.query("INSERT INTO user_profiles (user_id, tax_region) VALUES ('u1', 'MARS')"),
      ).rejects.toThrow(/CHK_user_profiles_tax_region/);
      await expect(
        ds.query("INSERT INTO user_profiles (user_id, housing_status) VALUES ('u2', 'castle')"),
      ).rejects.toThrow(/CHK_user_profiles_housing_status/);
      await ds.query("INSERT INTO user_profiles (user_id, tax_region) VALUES ('u3', 'SCOTLAND')");
    });

    it("is idempotent when the columns already exist (synchronize-built database)", async () => {
      await ds.synchronize();
      await expect(runUpInTransaction(new AddProfileFacts1794355723000())).resolves.toBe(undefined);
      await expect(runUpInTransaction(new AddProfileFacts1794355723000())).resolves.toBe(undefined);
      expect(await factColumns()).toHaveLength(FACT_COLUMNS.length);
    });

    it("down drops every column and constraint", async () => {
      await ds.runMigrations();
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await new AddProfileFacts1794355723000().down(runner);
        await runner.commitTransaction();
      } finally {
        await runner.release();
      }
      expect(await factColumns()).toEqual([]);
    });
  });

  describe("AddAccountStudentLoanPlanAndCurrencyDefault1794355800000", () => {
    const MIGRATION = "AddAccountStudentLoanPlanAndCurrencyDefault1794355800000";

    const planColumn = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'student_loan_plan'`,
      );
    const currencyDefault = async (): Promise<string | null> =>
      (
        await ds.query(
          `SELECT column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'currency'`,
        )
      )[0].column_default;

    it("adds a nullable plan column, defaults currency to GBP and keeps existing rows", async () => {
      await ds.runMigrations();
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      await ds.query(`ALTER TABLE "accounts" DROP CONSTRAINT "CHK_accounts_student_loan_plan"`);
      await ds.query(`ALTER TABLE "accounts" DROP COLUMN "student_loan_plan"`);
      await ds.query(`ALTER TABLE "accounts" ALTER COLUMN "currency" DROP DEFAULT`);
      await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency) VALUES ('u1', 'Cash', 'Current', 10, 'GBP')`,
      );

      await ds.runMigrations();

      expect(await planColumn()).toEqual([
        {
          column_name: "student_loan_plan",
          data_type: "character varying",
          is_nullable: "YES",
          column_default: null,
        },
      ]);
      expect(await currencyDefault()).toContain("GBP");
      expect(await ds.query("SELECT student_loan_plan FROM accounts")).toEqual([
        { student_loan_plan: null },
      ]);
      expect(await applied()).toContain(MIGRATION);
    });

    it("rejects a plan outside the allowed values", async () => {
      await ds.runMigrations();
      await expect(
        ds.query(
          `INSERT INTO accounts (user_id, name, type, balance, student_loan_plan) VALUES ('u1', 'SL', 'Student Loan', -1, 'PLAN_9')`,
        ),
      ).rejects.toThrow(/CHK_accounts_student_loan_plan/);
      await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, student_loan_plan) VALUES ('u2', 'SL', 'Student Loan', -1, 'PLAN_2')`,
      );
    });

    it("is idempotent when already applied (synchronize-built database)", async () => {
      await ds.synchronize();
      const m = () => new AddAccountStudentLoanPlanAndCurrencyDefault1794355800000();
      await expect(runUpInTransaction(m())).resolves.toBe(undefined);
      await expect(runUpInTransaction(m())).resolves.toBe(undefined);
      expect(await planColumn()).toHaveLength(1);
    });

    it("down removes the column, constraint and currency default", async () => {
      await ds.runMigrations();
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await new AddAccountStudentLoanPlanAndCurrencyDefault1794355800000().down(runner);
        await runner.commitTransaction();
      } finally {
        await runner.release();
      }
      expect(await planColumn()).toEqual([]);
      expect(await currencyDefault()).toBeNull();
    });
  });

  describe("BackfillAnnualTaxRecordEndDate1794355900000", () => {
    const MIGRATION = "BackfillAnnualTaxRecordEndDate1794355900000";
    const insert = async (frequency: string, date: string, endDate: string | null) =>
      (
        await ds.query(
          `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date, end_date)
           VALUES ('u1', 'income', 'paye', 'paye_salary', 'Pay', 1000, $1, $2, $3) RETURNING id`,
          [frequency, date, endDate],
        )
      )[0].id as string;
    const endDateOf = async (id: string): Promise<string | null> =>
      (
        await ds.query(
          `SELECT to_char(end_date, 'YYYY-MM-DD') AS e FROM tax_records WHERE id = $1`,
          [id],
        )
      )[0].e;
    const rerun = async () => {
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      await ds.runMigrations();
    };

    it("backfills only annual rows with NULL end_date, by the record rule", async () => {
      await ds.runMigrations();
      const aug = await insert("annual", "2024-08-15", null);
      const mar = await insert("annual", "2025-03-31", null);
      const apr1 = await insert("annual", "2024-04-01", null);
      const apr5 = await insert("annual", "2024-04-05", null);
      const apr6 = await insert("annual", "2024-04-06", null);
      const explicit = await insert("annual", "2024-08-15", "2030-04-05");
      const monthly = await insert("monthly", "2024-08-15", null);
      const oneOff = await insert("one-off", "2024-08-15", null);

      await rerun();

      expect(await endDateOf(aug)).toBe("2025-04-05");
      expect(await endDateOf(mar)).toBe("2025-04-05");
      expect(await endDateOf(apr1)).toBe("2025-04-05");
      expect(await endDateOf(apr5)).toBe("2025-04-05");
      expect(await endDateOf(apr6)).toBe("2025-04-05");
      expect(await endDateOf(explicit)).toBe("2030-04-05");
      expect(await endDateOf(monthly)).toBeNull();
      expect(await endDateOf(oneOff)).toBeNull();
      expect(await applied()).toContain(MIGRATION);
    });

    it("is idempotent", async () => {
      await ds.runMigrations();
      const id = await insert("annual", "2023-06-01", null);
      await rerun();
      await ds.query(`UPDATE tax_records SET end_date = '2031-04-05' WHERE id = $1`, [id]);
      await expect(
        runUpInTransaction(new BackfillAnnualTaxRecordEndDate1794355900000()),
      ).resolves.toBe(undefined);
      expect(await endDateOf(id)).toBe("2031-04-05");
    });

    it("is safe on an empty database and down is a no-op", async () => {
      await ds.runMigrations();
      await rerun();
      expect(await ds.query("SELECT count(*)::int AS n FROM tax_records")).toEqual([{ n: 0 }]);
      const id = await insert("annual", "2023-06-01", null);
      await rerun();
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await new BackfillAnnualTaxRecordEndDate1794355900000().down(runner);
        await runner.commitTransaction();
      } finally {
        await runner.release();
      }
      expect(await endDateOf(id)).toBe("2024-04-05");
    });
  });

  describe("AccountDetailsUserMonthIndex1794357300000", () => {
    const indexNames = async (): Promise<string[]> => {
      const rows: { indexname: string }[] = await ds.query(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'account_details' ORDER BY indexname`,
      );
      return rows.map((r) => r.indexname);
    };

    it("replaces the user_id index with (user_id, account_id, year, month); down() restores it", async () => {
      await ds.runMigrations();
      const defs: { indexdef: string }[] = await ds.query(
        `SELECT indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND indexname = 'IDX_account_details_user_account_year_month'`,
      );
      expect(defs[0]?.indexdef).toMatch(/\(user_id, account_id, year, month\)/);
      expect(await indexNames()).not.toContain("IDX_account_details_user");

      await runMigrationDown(new AccountDetailsUserMonthIndex1794357300000());
      const after = await indexNames();
      expect(after).toContain("IDX_account_details_user");
      expect(after).not.toContain("IDX_account_details_user_account_year_month");
    });
  });

  describe("AddUserIdIndexes1794358100000", () => {
    const NAMES = USER_ID_INDEXES.map((i) => i.name).sort();

    const userIdIndexes = async (): Promise<{ name: string; def: string; valid: boolean }[]> =>
      ds.query(
        `SELECT c.relname AS name, pg_get_indexdef(i.indexrelid) AS def, i.indisvalid AS valid
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
         WHERE c.relname = ANY($1) ORDER BY c.relname`,
        [NAMES],
      );

    it("builds every index, valid and with the planned columns; down() drops them all", async () => {
      await ds.runMigrations();
      const built = await userIdIndexes();
      expect(built.map((b) => b.name)).toEqual(NAMES);
      for (const index of USER_ID_INDEXES) {
        const row = built.find((b) => b.name === index.name);
        expect(row?.valid).toBe(true);
        expect(row?.def.replaceAll('"', "")).toContain(
          `ON public.${index.table} USING btree (${index.columns.join(", ")})`,
        );
      }

      await undoThrough("AddUserIdIndexes1794358100000");
      expect(await userIdIndexes()).toEqual([]);
    });

    it("runs outside a transaction, as CREATE INDEX CONCURRENTLY requires", () => {
      expect(new AddUserIdIndexes1794358100000().transaction).toBe(false);
    });

    it("rebuilds an index a crashed concurrent build left INVALID", async () => {
      await ds.runMigrations();
      await ds.query(
        "UPDATE pg_index SET indisvalid = false WHERE indexrelid = '\"IDX_transactions_account\"'::regclass",
      );
      expect(
        (await userIdIndexes()).find((b) => b.name === "IDX_transactions_account")?.valid,
      ).toBe(false);

      // A crash mid-build never records the migration, so the next boot runs up() again.
      await ds.query("DELETE FROM migrations WHERE name = 'AddUserIdIndexes1794358100000'");

      const runner = ds.createQueryRunner();
      try {
        await new AddUserIdIndexes1794358100000().up(runner);
        // The pool's limits are back on the connection afterwards.
        expect(await runner.query("SHOW statement_timeout")).toEqual([
          { statement_timeout: "10s" },
        ]);
        expect(await runner.query("SHOW lock_timeout")).toEqual([{ lock_timeout: "5s" }]);
      } finally {
        await runner.release();
      }
      expect((await userIdIndexes()).every((b) => b.valid)).toBe(true);
    });
  });

  // The catalog twin of src/entities/table-laws.spec.ts: what the migrations really built.
  describe("table laws on the migrated schema", () => {
    it("every user_id column leads an index (unique and primary keys count)", async () => {
      await ds.runMigrations();
      const missing: { table_name: string }[] = await ds.query(
        `SELECT c.table_name FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
           AND NOT EXISTS (
             SELECT 1 FROM pg_index i
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
             WHERE i.indrelid = format('public.%I', c.table_name)::regclass AND a.attname = 'user_id'
           )
         ORDER BY c.table_name`,
      );
      expect(missing).toEqual([]);
    });

    it("every foreign key's first column leads an index", async () => {
      await ds.runMigrations();
      const missing: { constraint: string }[] = await ds.query(
        `SELECT con.conname AS constraint FROM pg_constraint con
         WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace
           AND NOT EXISTS (
             SELECT 1 FROM pg_index i WHERE i.indrelid = con.conrelid AND i.indkey[0] = con.conkey[1]
           )`,
      );
      expect(missing).toEqual([]);
    });
  });

  describe("UniqueAccountDetailMonth1794356000000", () => {
    const MIGRATION = "UniqueAccountDetailMonth1794356000000";
    const INDEX = "UQ_account_details_account_year_month";

    const uniqueIndex = (): Promise<{ indexdef: string }[]> =>
      ds.query(
        `SELECT indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'account_details' AND indexname = $1`,
        [INDEX],
      );

    const insertDetail = (account: string, year: number, month: number, value: number) =>
      ds.query(
        "INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date) VALUES ($1, 'u', $2, $3, $4, make_date($2, $3, 1))",
        [account, year, month, value],
      );

    // account_id is a uuid keyed to accounts (AccountIdForeignKeys1794358200000).
    const A1 = "00000000-0000-4000-8000-0000000000a1";
    const A2 = "00000000-0000-4000-8000-0000000000a2";
    const insertAccounts = () =>
      ds.query(
        `INSERT INTO accounts (id, user_id, name, type, balance, currency)
         VALUES ($1, 'u', 'A1', 'Current', 0, 'GBP'), ($2, 'u', 'A2', 'Current', 0, 'GBP')`,
        [A1, A2],
      );

    // Back to the state before this migration: no index, migration forgotten.
    const rerun = async (): Promise<void> => {
      await ds.query(`DROP INDEX "${INDEX}"`);
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
    };

    it("deletes duplicates keeping the max id per account and month, then creates the index", async () => {
      await ds.runMigrations();
      await rerun();
      await insertAccounts();
      await insertDetail(A1, 2026, 1, 100); // dup, oldest
      await insertDetail(A1, 2026, 1, 150); // dup, middle (highest value, not kept)
      await insertDetail(A1, 2026, 1, 120); // dup, max id: kept
      await insertDetail(A1, 2026, 2, 130); // different month
      await insertDetail(A2, 2026, 1, 900); // different account
      const keep: { id: number }[] = await ds.query(
        "SELECT max(id) AS id FROM account_details WHERE account_id = $1 AND month = 1",
        [A1],
      );

      await ds.runMigrations();

      const rows = await ds.query(
        "SELECT id, account_id, year, month, value::float AS value FROM account_details ORDER BY account_id, month",
      );
      expect(rows).toEqual([
        { id: keep[0]?.id, account_id: A1, year: 2026, month: 1, value: 120 },
        { id: expect.any(Number), account_id: A1, year: 2026, month: 2, value: 130 },
        { id: expect.any(Number), account_id: A2, year: 2026, month: 1, value: 900 },
      ]);
      expect(await uniqueIndex()).toHaveLength(1);
      expect((await uniqueIndex())[0]?.indexdef).toMatch(
        /UNIQUE INDEX .* \(account_id, year, month\)/,
      );
      await expect(insertDetail(A1, 2026, 2, 1)).rejects.toThrow(/UQ_account_details/);
      expect(await applied()).toContain(MIGRATION);
    });

    it("is idempotent when the index already exists (synchronize-built database)", async () => {
      await ds.synchronize();
      expect(await uniqueIndex()).toHaveLength(1);
      await insertDetail(A1, 2026, 1, 5);
      await expect(runUpInTransaction(new UniqueAccountDetailMonth1794356000000())).resolves.toBe(
        undefined,
      );
      await expect(runUpInTransaction(new UniqueAccountDetailMonth1794356000000())).resolves.toBe(
        undefined,
      );
      expect(await uniqueIndex()).toHaveLength(1);
      expect(await ds.query("SELECT count(*)::int AS n FROM account_details")).toEqual([{ n: 1 }]);
    });

    it("is safe on an empty table", async () => {
      await ds.runMigrations();
      await rerun();
      await expect(runUpInTransaction(new UniqueAccountDetailMonth1794356000000())).resolves.toBe(
        undefined,
      );
      expect(await uniqueIndex()).toHaveLength(1);
    });

    it("down drops the index and allows duplicates again", async () => {
      await ds.runMigrations();
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await new UniqueAccountDetailMonth1794356000000().down(runner);
        await runner.commitTransaction();
      } finally {
        await runner.release();
      }
      expect(await uniqueIndex()).toEqual([]);
      await insertAccounts();
      await insertDetail(A1, 2026, 1, 1);
      await insertDetail(A1, 2026, 1, 2);
    });
  });

  describe("AddImportBatchesAndAgentAudit1794356200000 (E17 PR C)", () => {
    const MIGRATION = "AddImportBatchesAndAgentAudit1794356200000";

    const account = async (): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('user-a', 'Acc', 'Current', 10, 'GBP') RETURNING id`,
      );
      return at(rows, 0).id;
    };
    const batch = async (key = "k-1"): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO import_batches (user_id, idempotency_key, payload, counts, validation_errors, expires_at)
         VALUES ('user-a', $1, '{}', '{}', '{}', now() + interval '7 days') RETURNING id`,
        [key],
      );
      return at(rows, 0).id;
    };

    it("allows source agent with a batch id, nulls it when the batch goes, and keys are unique per user", async () => {
      await ds.runMigrations();
      const id = await account();
      const b = await batch();
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source, import_batch_id)
         VALUES ($1, 'user-a', 2026, 1, 5, '2026-01-31', 'agent', $2)`,
        [id, b],
      );
      await expect(batch()).rejects.toThrow(/UQ_import_batches_user_idempotency_key/);
      await expect(
        ds.query(`UPDATE import_batches SET status = 'pending' WHERE id = $1`, [b]),
      ).rejects.toThrow(/CHK_import_batches_status/);
      await ds.query("DELETE FROM import_batches WHERE id = $1", [b]);
      expect(await ds.query("SELECT source, import_batch_id FROM account_details")).toEqual([
        { source: "agent", import_batch_id: null },
      ]);
      await expect(
        ds.query(
          `INSERT INTO agent_audit_events (user_id, tool_name, outcome, latency_ms, response_bytes)
           VALUES ('user-a', 't', 'maybe', 1, 1)`,
        ),
      ).rejects.toThrow(/CHK_agent_audit_events_outcome/);
    });

    it("down() drops the tables and column, relabels agent rows manual and restores the old CHECK", async () => {
      await ds.runMigrations();
      const id = await account();
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, 'user-a', 2026, 1, 5, '2026-01-31', 'agent')`,
        [id],
      );
      await undoThrough(MIGRATION);
      expect(await tables()).not.toContain("import_batches");
      expect(await tables()).not.toContain("agent_audit_events");
      const cols: { column_name: string }[] = await ds.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'account_details'",
      );
      expect(cols.map((c) => c.column_name)).not.toContain("import_batch_id");
      expect(await ds.query("SELECT source, value FROM account_details")).toEqual([
        { source: "manual", value: "5.00" },
      ]);
      await expect(
        ds.query(
          `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
           VALUES ($1, 'user-a', 2026, 2, 5, '2026-02-28', 'agent')`,
          [id],
        ),
      ).rejects.toThrow(/CHK_account_details_source/);
      // And up again on top of the reverted schema.
      await ds.runMigrations();
      expect(await tables()).toEqual(ENTITY_TABLES);
    });
  });

  describe("AllowCheckInSources1794900000000 (R2-5 check-in)", () => {
    const MIGRATION = "AllowCheckInSources1794900000000";
    const account = async (): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('user-a', 'Acc', 'Mortgage', -1000, 'GBP') RETURNING id`,
      );
      return at(rows, 0).id;
    };
    const insert = (id: string, month: number, source: string) =>
      ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, 'user-a', 2026, $2, -1000, make_date(2026, $2, 1), $3)`,
        [id, month, source],
      );

    it("allows confirmed and calculated; down() relabels them manual; up again works", async () => {
      await ds.runMigrations();
      const id = await account();
      await insert(id, 1, "confirmed");
      await insert(id, 2, "calculated");
      await expect(insert(id, 3, "guess")).rejects.toThrow(/CHK_account_details_source/);

      await undoThrough(MIGRATION);
      expect(await ds.query("SELECT month, source FROM account_details ORDER BY month")).toEqual([
        { month: 1, source: "manual" },
        { month: 2, source: "manual" },
      ]);
      await expect(insert(id, 4, "confirmed")).rejects.toThrow(/CHK_account_details_source/);

      await ds.runMigrations();
      await insert(id, 5, "calculated");
      expect(await tables()).toEqual(ENTITY_TABLES);
    });
  });

  describe("SalarySacrificeDefaultFalse1794357400000", () => {
    const MIGRATION = "SalarySacrificeDefaultFalse1794357400000";
    const flag = async (userId: string): Promise<boolean> =>
      (
        await ds.query("SELECT is_salary_sacrifice FROM user_profiles WHERE user_id = $1", [userId])
      )[0].is_salary_sacrifice;

    it("leaves existing rows untouched; down() restores true", async () => {
      await ds.runMigrations();
      await undoThrough(MIGRATION);
      // A chosen 6% keeps the row out of ClearDefaultPensionRates, whose run depends on the date.
      await ds.query("INSERT INTO user_profiles (user_id, pension_percent) VALUES ('before', 6)");
      expect(await flag("before")).toBe(true);

      await ds.runMigrations();
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('after')");
      expect(await flag("before")).toBe(true);
      // PensionAnswersNullable1795480000000 has since dropped the default: not answered is null.
      expect(await flag("after")).toBeNull();

      await undoThrough(MIGRATION);
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('reverted')");
      expect(await flag("reverted")).toBe(true);
    });
  });

  describe("AddAccountDeletionTombstones1794622492000 (BE-04)", () => {
    it("creates the tombstone table with a unique subject hash; down() drops it and up() runs again", async () => {
      await ds.runMigrations();
      await ds.query(
        `INSERT INTO account_deletion_tombstones (subject_hash, deleted_at, expires_at)
         VALUES ('abc', now(), now() + interval '24 months')`,
      );
      await expect(
        ds.query(
          `INSERT INTO account_deletion_tombstones (subject_hash, deleted_at, expires_at)
           VALUES ('abc', now(), now())`,
        ),
      ).rejects.toThrow(/UQ_account_deletion_tombstones_subject_hash/);
      const cols: { column_name: string }[] = await ds.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'account_deletion_tombstones' ORDER BY column_name",
      );
      // No user id column: the table holds a keyed hash only.
      expect(cols.map((c) => c.column_name)).toEqual([
        "deleted_at",
        "expires_at",
        "id",
        "identity_deleted_at",
        "subject_hash",
      ]);

      await runMigrationDown(new AddAccountDeletionTombstones1794622492000());
      expect(await tables()).not.toContain("account_deletion_tombstones");
      await ds.query(
        `DELETE FROM migrations WHERE name = 'AddAccountDeletionTombstones1794622492000'`,
      );
      await ds.runMigrations();
      expect(await tables()).toEqual(ENTITY_TABLES);
    });
  });

  describe("AddRateLimitBuckets1794632012000 (BE-07)", () => {
    const bucketTable = async (): Promise<string[]> =>
      (
        await ds.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limit_buckets'",
        )
      ).map((r: { table_name: string }) => r.table_name);

    it("creates the bucket table with a key primary key and an expiry index; down() drops it and up() runs again", async () => {
      await ds.runMigrations();
      expect(await bucketTable()).toEqual(["rate_limit_buckets"]);
      const cols: { column_name: string; data_type: string; is_nullable: string }[] =
        await ds.query(
          "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'rate_limit_buckets' ORDER BY column_name",
        );
      expect(cols).toEqual([
        { column_name: "count", data_type: "integer", is_nullable: "NO" },
        { column_name: "expires_at", data_type: "timestamp with time zone", is_nullable: "NO" },
        { column_name: "key", data_type: "text", is_nullable: "NO" },
        { column_name: "window_start", data_type: "timestamp with time zone", is_nullable: "NO" },
      ]);
      const indexes: { indexname: string }[] = await ds.query(
        "SELECT indexname FROM pg_indexes WHERE tablename = 'rate_limit_buckets' ORDER BY indexname",
      );
      expect(indexes.map((i) => i.indexname)).toEqual([
        "IDX_rate_limit_buckets_expires_at",
        "PK_rate_limit_buckets",
      ]);
      await ds.query(
        "INSERT INTO rate_limit_buckets (key, window_start, count, expires_at) VALUES ('k', now(), 1, now())",
      );
      await expect(
        ds.query(
          "INSERT INTO rate_limit_buckets (key, window_start, count, expires_at) VALUES ('k', now(), 1, now())",
        ),
      ).rejects.toThrow(/PK_rate_limit_buckets/);

      await runMigrationDown(new AddRateLimitBuckets1794632012000());
      expect(await bucketTable()).toEqual([]);
      expect(await tables()).toEqual(ENTITY_TABLES);
      await ds.query("DELETE FROM migrations WHERE name = 'AddRateLimitBuckets1794632012000'");
      await ds.runMigrations();
      expect(await bucketTable()).toEqual(["rate_limit_buckets"]);
    });
  });

  describe("AddIdempotencyKeysAndAccountVersion1794632100000", () => {
    const MIGRATION = "AddIdempotencyKeysAndAccountVersion1794632100000";
    const accountColumns = async (): Promise<string[]> =>
      (
        await ds.query(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' ORDER BY column_name",
        )
      ).map((r: { column_name: string }) => r.column_name);

    it("gives existing accounts a version, enforces one key per user and route; down() drops both", async () => {
      await ds.runMigrations();
      await undoThrough(MIGRATION);
      expect(await tables()).not.toContain("idempotency_keys");
      expect(await accountColumns()).not.toContain("updated_at");
      await ds.query(
        "INSERT INTO accounts (user_id, name, type, balance) VALUES ('u1', 'Before', 'Current', 10)",
      );

      await ds.runMigrations();
      const [row] = await ds.query("SELECT updated_at FROM accounts WHERE name = 'Before'");
      expect(row.updated_at).toBeInstanceOf(Date);
      const insertKey = (userId: string, routeId: string) =>
        ds.query(
          `INSERT INTO idempotency_keys (user_id, route_id, key, request_hash) VALUES ($1, $2, 'k1', $3)`,
          [userId, routeId, "a".repeat(64)],
        );
      await insertKey("u1", "accounts.create");
      await insertKey("u2", "accounts.create");
      await insertKey("u1", "budget.create");
      await expect(insertKey("u1", "accounts.create")).rejects.toThrow(
        /UQ_idempotency_keys_user_route_key/,
      );

      await undoThrough(MIGRATION);
      expect(await tables()).not.toContain("idempotency_keys");
      expect(await accountColumns()).not.toContain("updated_at");
      expect(await ds.query("SELECT name FROM accounts")).toEqual([{ name: "Before" }]);
    });
  });

  describe("AddLivingWithFamilyHousingStatus1794700000000 (E16 PR 9)", () => {
    const housing = async (): Promise<unknown[]> =>
      ds.query(
        "SELECT user_id, housing_status, monthly_housing_cost::float AS cost FROM user_profiles ORDER BY user_id",
      );

    it("allows living with family and still rejects values outside the list", async () => {
      await ds.runMigrations();
      await ds.query(
        "INSERT INTO user_profiles (user_id, housing_status) VALUES ('u1', 'living_with_family')",
      );
      await expect(
        ds.query("INSERT INTO user_profiles (user_id, housing_status) VALUES ('u2', 'castle')"),
      ).rejects.toThrow(/CHK_user_profiles_housing_status/);
    });

    it("down sets living with family to not answered, keeps the amount and restores the old check", async () => {
      await ds.runMigrations();
      await ds.query(
        `INSERT INTO user_profiles (user_id, housing_status, monthly_housing_cost)
         VALUES ('a', 'living_with_family', 150), ('b', 'renting', 900), ('c', NULL, NULL)`,
      );

      await runMigrationDown(new AddLivingWithFamilyHousingStatus1794700000000());

      expect(await housing()).toEqual([
        { user_id: "a", housing_status: null, cost: 150 },
        { user_id: "b", housing_status: "renting", cost: 900 },
        { user_id: "c", housing_status: null, cost: null },
      ]);
      await expect(
        ds.query(
          "INSERT INTO user_profiles (user_id, housing_status) VALUES ('d', 'living_with_family')",
        ),
      ).rejects.toThrow(/CHK_user_profiles_housing_status/);
      await ds.query(
        "INSERT INTO user_profiles (user_id, housing_status) VALUES ('e', 'mortgage')",
      );
    });

    it("is idempotent: up runs twice, and again after down", async () => {
      await ds.runMigrations();
      await expect(
        runUpInTransaction(new AddLivingWithFamilyHousingStatus1794700000000()),
      ).resolves.toBe(undefined);
      await runMigrationDown(new AddLivingWithFamilyHousingStatus1794700000000());
      await expect(
        runUpInTransaction(new AddLivingWithFamilyHousingStatus1794700000000()),
      ).resolves.toBe(undefined);
      await ds.query(
        "INSERT INTO user_profiles (user_id, housing_status) VALUES ('u1', 'living_with_family')",
      );
    });
  });

  describe("AddNetWorthChoices1794800000000 (net worth choices)", () => {
    const choices = async (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, net_worth_counts_property AS property,
                net_worth_counts_student_loan AS student_loan
           FROM user_profiles ORDER BY user_id`,
      );
    const hasColumns = async (): Promise<number> => {
      const rows: Array<{ n: string }> = await ds.query(
        `SELECT count(*) AS n FROM information_schema.columns
          WHERE table_name = 'user_profiles'
            AND column_name IN ('net_worth_counts_property', 'net_worth_counts_student_loan')`,
      );
      return Number(at(rows, 0)?.n);
    };

    it("gives existing and new profiles today's defaults: property counts, student loans do not", async () => {
      // A profile saved before the columns existed, then the migration adds them.
      await ds.runMigrations();
      await runMigrationDown(new AddNetWorthChoices1794800000000());
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('existing')");
      await runUpInTransaction(new AddNetWorthChoices1794800000000());
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('new')");
      expect(await choices()).toEqual([
        { user_id: "existing", property: true, student_loan: false },
        { user_id: "new", property: true, student_loan: false },
      ]);
      await expect(
        ds.query(
          "INSERT INTO user_profiles (user_id, net_worth_counts_property) VALUES ('n', NULL)",
        ),
      ).rejects.toThrow(/null value/);
    });

    it("down drops both columns, and up is idempotent before and after", async () => {
      await ds.runMigrations();
      await expect(runUpInTransaction(new AddNetWorthChoices1794800000000())).resolves.toBe(
        undefined,
      );
      expect(await hasColumns()).toBe(2);
      await runMigrationDown(new AddNetWorthChoices1794800000000());
      expect(await hasColumns()).toBe(0);
      await runUpInTransaction(new AddNetWorthChoices1794800000000());
      expect(await hasColumns()).toBe(2);
    });
  });

  describe("AuditActionUserExported1795000000000 (BE-15, N3)", () => {
    const NAME = "AuditActionUserExported1795000000000";
    const insertAction = (action: string): Promise<unknown> =>
      ds.query("INSERT INTO audit_events (user_id, action) VALUES ('u1', $1)", [action]);
    const actionCheck = async (): Promise<string> => {
      const rows: Array<{ def: string }> = await ds.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conname = 'CHK_audit_events_action'`,
      );
      return at(rows, 0)?.def ?? "";
    };
    const auditActions = async (): Promise<string[]> => {
      const rows: Array<{ action: string }> = await ds.query(
        "SELECT action FROM audit_events ORDER BY action",
      );
      return rows.map((r) => r.action);
    };
    /** Undoes any migrations after this one, so this one is the last applied. */
    const undoLaterMigrations = async (): Promise<void> => {
      while ((await applied()).at(-1) !== NAME) {
        await ds.undoLastMigration();
      }
      expect(await applied()).not.toContain("AddRetirementPlan1795260000000");
      expect(await applied()).not.toContain("EncryptTaxReceipts1795200000000");
      expect(await applied()).not.toContain("AuditEventsDeleteAndTruncateGuards1795100000000");
      expect(await applied()).toContain(NAME);
    };

    it("up allows user.exported and still rejects actions outside the list", async () => {
      await ds.runMigrations();
      await insertAction("user.exported");
      await expect(insertAction("made.up")).rejects.toThrow(/CHK_audit_events_action/);
    });

    it("down with no user.exported rows restores the seven-value check", async () => {
      await ds.runMigrations();
      await insertAction("financial_data.reset");
      await undoLaterMigrations();
      await ds.undoLastMigration();
      expect(await applied()).not.toContain(NAME);
      expect(await actionCheck()).not.toContain("user.exported");
      await expect(insertAction("user.exported")).rejects.toThrow(/CHK_audit_events_action/);
      expect(await auditActions()).toEqual(["financial_data.reset"]);
    });

    it("down is refused while a user.exported row exists, and changes nothing", async () => {
      await ds.runMigrations();
      await insertAction("user.exported");
      await insertAction("account.deleted");
      await undoLaterMigrations();
      await expect(ds.undoLastMigration()).rejects.toThrow(
        "audit_events contains user.exported rows; export or archive them before reverting",
      );
      expect(await applied()).toContain(NAME);
      expect(await actionCheck()).toContain("user.exported");
      expect(await auditActions()).toEqual(["account.deleted", "user.exported"]);
      await insertAction("user.exported");
    });

    it("up runs again after down, and is idempotent", async () => {
      await ds.runMigrations();
      await undoLaterMigrations();
      await ds.undoLastMigration();
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      await expect(runUpInTransaction(new AuditActionUserExported1795000000000())).resolves.toBe(
        undefined,
      );
      await insertAction("user.exported");
    });
  });

  describe("AuditEventsDeleteAndTruncateGuards1795100000000 (SEC-F, S10)", () => {
    const NAME = "AuditEventsDeleteAndTruncateGuards1795100000000";
    const insertAction = (action: string): Promise<unknown> =>
      ds.query("INSERT INTO audit_events (user_id, action) VALUES ('u1', $1)", [action]);
    const auditCount = async (): Promise<number> => {
      const rows: Array<{ n: number }> = await ds.query(
        "SELECT count(*)::int AS n FROM audit_events",
      );
      return Number(at(rows, 0)?.n);
    };
    const triggers = async (): Promise<string[]> => {
      const rows: Array<{ tgname: string }> = await ds.query(
        `SELECT tgname FROM pg_trigger
          WHERE tgrelid = 'audit_events'::regclass AND NOT tgisinternal ORDER BY tgname`,
      );
      return rows.map((r) => r.tgname);
    };
    const guardFunctions = async (): Promise<string[]> => {
      const rows: Array<{ proname: string }> = await ds.query(
        `SELECT proname FROM pg_proc
          WHERE proname IN ('audit_events_guard_delete', 'audit_events_refuse_truncate')
          ORDER BY proname`,
      );
      return rows.map((r) => r.proname);
    };
    const deleteWithReason = (reason: string): Promise<unknown> =>
      ds.transaction(async (manager) => {
        await manager.query("SELECT set_config('flump.audit_delete', $1, true)", [reason]);
        await manager.query("DELETE FROM audit_events");
      });

    it("up refuses TRUNCATE and an undeclared DELETE, and keeps the UPDATE refusal", async () => {
      await ds.runMigrations();
      expect(await triggers()).toEqual([
        "TRG_audit_events_append_only",
        "TRG_audit_events_guard_delete",
        "TRG_audit_events_no_truncate",
      ]);
      await insertAction("account.deleted");
      await expect(ds.query("TRUNCATE audit_events")).rejects.toThrow(/cannot be truncated/);
      await expect(ds.query("DELETE FROM audit_events")).rejects.toThrow(
        /deleted only by retention or erasure/,
      );
      await expect(deleteWithReason("anything else")).rejects.toThrow(
        /deleted only by retention or erasure/,
      );
      await expect(ds.query("UPDATE audit_events SET action = action")).rejects.toThrow(
        /append-only/,
      );
      expect(await auditCount()).toBe(1);
    });

    it("audit_events has no foreign key, so no delete elsewhere can cascade into it", async () => {
      await ds.runMigrations();
      const rows: unknown[] = await ds.query(
        `SELECT conname FROM pg_constraint
          WHERE contype = 'f' AND 'audit_events'::regclass IN (conrelid, confrelid)`,
      );
      expect(rows).toEqual([]);
    });

    it.each(["retention", "erasure"])(
      "a transaction that declares %s may delete",
      async (reason) => {
        await ds.runMigrations();
        await insertAction("account.deleted");
        await deleteWithReason(reason);
        expect(await auditCount()).toBe(0);
      },
    );

    it("down removes only the two guards and keeps every audit row; up is repeatable", async () => {
      await ds.runMigrations();
      await insertAction("account.deleted");
      await insertAction("user.exported");
      while ((await applied()).includes(NAME)) {
        await ds.undoLastMigration();
      }
      expect(await applied()).not.toContain(NAME);
      expect(await triggers()).toEqual(["TRG_audit_events_append_only"]);
      expect(await guardFunctions()).toEqual([]);
      expect(await auditCount()).toBe(2);
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      await expect(
        runUpInTransaction(new AuditEventsDeleteAndTruncateGuards1795100000000()),
      ).resolves.toBe(undefined);
      expect(await triggers()).toHaveLength(3);
      expect(await guardFunctions()).toHaveLength(2);
      expect(await auditCount()).toBe(2);
    });
  });

  describe("AddAccountSubtypeCreditLimitAndPromo1795300000000 (UX Batch D)", () => {
    const NAME = "AddAccountSubtypeCreditLimitAndPromo1795300000000";
    const newColumns = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'accounts'
            AND column_name IN ('account_subtype', 'credit_limit', 'promo_zero_percent_until')
          ORDER BY column_name`,
      );
    const insertAccount = (): Promise<unknown> =>
      ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('u1', 'Card', 'Credit Card', -250, 'GBP')`,
      );

    it("adds three nullable columns and leaves existing rows unset", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await insertAccount();
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await newColumns()).toEqual([
        { column_name: "account_subtype", data_type: "character varying", is_nullable: "YES" },
        { column_name: "credit_limit", data_type: "numeric", is_nullable: "YES" },
        { column_name: "promo_zero_percent_until", data_type: "date", is_nullable: "YES" },
      ]);
      expect(
        await ds.query(
          "SELECT account_subtype, credit_limit, promo_zero_percent_until FROM accounts",
        ),
      ).toEqual([{ account_subtype: null, credit_limit: null, promo_zero_percent_until: null }]);
    });

    it("is idempotent when the columns already exist", async () => {
      await ds.runMigrations();
      await expect(
        runUpInTransaction(new AddAccountSubtypeCreditLimitAndPromo1795300000000()),
      ).resolves.toBe(undefined);
      expect(await newColumns()).toHaveLength(3);
    });

    it("down drops the columns while no account holds a value, and up runs again", async () => {
      await ds.runMigrations();
      await insertAccount();
      await undoThrough(NAME);
      expect(await newColumns()).toEqual([]);
      expect(await ds.query("SELECT count(*)::int AS n FROM accounts")).toEqual([{ n: 1 }]);
      await ds.runMigrations();
      expect(await newColumns()).toHaveLength(3);
    });

    it("down is refused while a saved value exists, and changes nothing", async () => {
      await ds.runMigrations();
      await insertAccount();
      await ds.query("UPDATE accounts SET credit_limit = 3000");
      // Undo the newer migrations first, so undoing the last one is this one.
      while ((await applied()).at(-1) !== NAME) await ds.undoLastMigration();
      await expect(ds.undoLastMigration()).rejects.toThrow(SUBTYPE_DOWN_REFUSAL);
      expect(await applied()).toContain(NAME);
      expect(await newColumns()).toHaveLength(3);
      expect(await ds.query("SELECT credit_limit FROM accounts")).toEqual([
        { credit_limit: "3000.00" },
      ]);
    });
  });
  describe("AddBudgetEntryJointShare1795350000000 (E34 C1)", () => {
    const NAME = "AddBudgetEntryJointShare1795350000000";
    const jointColumns = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'budget_entries'
            AND column_name IN ('ownership', 'share_percent')
          ORDER BY column_name`,
      );
    const insertEntry = (): Promise<unknown> =>
      ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount)
         VALUES ('u1', 'housing', 'Rent', 1200)`,
      );

    it("adds ownership (sole) and a nullable share, and existing rows stay sole", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await insertEntry();
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await jointColumns()).toEqual([
        {
          column_name: "ownership",
          data_type: "character varying",
          is_nullable: "NO",
          column_default: "'sole'::character varying",
        },
        {
          column_name: "share_percent",
          data_type: "smallint",
          is_nullable: "YES",
          column_default: null,
        },
      ]);
      expect(await ds.query("SELECT ownership, share_percent, amount FROM budget_entries")).toEqual(
        [{ ownership: "sole", share_percent: null, amount: "1200.00" }],
      );
    });

    it("refuses an unknown ownership and a share outside 1 to 100", async () => {
      await ds.runMigrations();
      await insertEntry();
      await expect(ds.query("UPDATE budget_entries SET ownership = 'shared'")).rejects.toThrow(
        /CHK_budget_entries_ownership/,
      );
      await expect(ds.query("UPDATE budget_entries SET share_percent = 0")).rejects.toThrow(
        /CHK_budget_entries_share_percent/,
      );
      await expect(ds.query("UPDATE budget_entries SET share_percent = 101")).rejects.toThrow(
        /CHK_budget_entries_share_percent/,
      );
    });

    it("is idempotent when the columns already exist", async () => {
      await ds.runMigrations();
      await expect(runUpInTransaction(new AddBudgetEntryJointShare1795350000000())).resolves.toBe(
        undefined,
      );
      expect(await jointColumns()).toHaveLength(2);
    });

    it("down drops the columns while every entry is sole, and up runs again", async () => {
      await ds.runMigrations();
      await insertEntry();
      await undoThrough(NAME);
      expect(await jointColumns()).toEqual([]);
      await ds.runMigrations();
      expect(await jointColumns()).toHaveLength(2);
    });

    it("down is refused while an entry is joint, and changes nothing", async () => {
      await ds.runMigrations();
      await insertEntry();
      await ds.query("UPDATE budget_entries SET ownership = 'joint', share_percent = 50");
      while ((await applied()).at(-1) !== NAME) await ds.undoLastMigration();
      await expect(ds.undoLastMigration()).rejects.toThrow(BUDGET_JOINT_DOWN_REFUSAL);
      expect(await applied()).toContain(NAME);
      expect(await ds.query("SELECT ownership, share_percent FROM budget_entries")).toEqual([
        { ownership: "joint", share_percent: 50 },
      ]);
    });
  });
  describe("ClearUnchosenSectionOrder1795500000000 (home section order)", () => {
    const NAME = "ClearUnchosenSectionOrder1795500000000";
    const rows = (): Promise<unknown[]> =>
      ds.query(
        "SELECT user_id, dashboard_widget_order, dashboard_widgets FROM user_profiles ORDER BY user_id",
      );

    it("up clears every saved section order and nothing else", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await ds.query(
        `INSERT INTO user_profiles (user_id, dashboard_widget_order, dashboard_widgets) VALUES
           ('u1', 'accounts,budget,savings', 'accounts,budget'),
           ('u2', NULL, 'tax')`,
      );
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await rows()).toEqual([
        { user_id: "u1", dashboard_widget_order: null, dashboard_widgets: "accounts,budget" },
        { user_id: "u2", dashboard_widget_order: null, dashboard_widgets: "tax" },
      ]);
    });

    it("a re-run once recorded (a second instance in a rolling deploy) keeps orders chosen since", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      await ds.query(
        `INSERT INTO user_profiles (user_id, dashboard_widget_order) VALUES ('u1', 'tax,debt')`,
      );
      await runUpInTransaction(new ClearUnchosenSectionOrder1795500000000());
      expect(await rows()).toEqual([
        { user_id: "u1", dashboard_widget_order: "tax,debt", dashboard_widgets: null },
      ]);
    });

    it("down restores nothing and keeps orders chosen since", async () => {
      await ds.runMigrations();
      await ds.query(
        `INSERT INTO user_profiles (user_id, dashboard_widget_order) VALUES ('u1', 'tax,debt')`,
      );
      await undoThrough(NAME);
      expect(await applied()).not.toContain(NAME);
      expect(await rows()).toEqual([
        { user_id: "u1", dashboard_widget_order: "tax,debt", dashboard_widgets: null },
      ]);
    });
  });

  describe("SavingsRowsNotEssential1795450000000 (owner item 28)", () => {
    const NAME = "SavingsRowsNotEssential1795450000000";
    const rows = (): Promise<unknown[]> =>
      ds.query("SELECT category, name, is_income, is_essential FROM budget_entries ORDER BY name");

    it("clears the flag on savings spending rows only, and a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, is_income, is_essential) VALUES
           ('u1', 'savings', 'Emergency fund', 200, false, true),
           ('u1', 'savings', 'Interest', 10, true, true),
           ('u1', 'housing', 'Rent', 1200, false, true),
           ('u1', 'expenses', 'Takeaways', 50, false, false)`,
      );
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      const after = [
        { category: "savings", name: "Emergency fund", is_income: false, is_essential: false },
        { category: "savings", name: "Interest", is_income: true, is_essential: true },
        { category: "housing", name: "Rent", is_income: false, is_essential: true },
        { category: "expenses", name: "Takeaways", is_income: false, is_essential: false },
      ].sort((a, b) => a.name.localeCompare(b.name));
      expect(await rows()).toEqual(after);
      await runUpInTransaction(new SavingsRowsNotEssential1795450000000());
      expect(await rows()).toEqual(after);
    });
  });

  describe("AddBudgetEntryLinkKind1795440000000 (owner items 7 and 33b)", () => {
    const NAME = "AddBudgetEntryLinkKind1795440000000";
    const insert = (name: string, linkKind: string | null): Promise<unknown> =>
      ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, is_income, is_essential, link_kind)
         VALUES ('u1', 'income', $1, 0, true, true, $2)`,
        [name, linkKind],
      );

    it("allows the two kinds once per user, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      await insert("Take-home pay", "take_home");
      await insert("Rent", "housing");
      await insert("Child benefit", null);
      await insert("Bonus", null);
      // One line per user per fact.
      await expect(insert("Second take-home", "take_home")).rejects.toThrow(/unique|duplicate/i);
      // Only the two kinds.
      await expect(insert("Other", "pension")).rejects.toThrow(/check constraint/i);
      await runUpInTransaction(new AddBudgetEntryLinkKind1795440000000());
      const rows: { n: string }[] = await ds.query(
        "SELECT count(*)::text AS n FROM budget_entries WHERE link_kind IS NOT NULL",
      );
      expect(rows[0]?.n).toBe("2");
    });

    it("refuses to revert while a line is linked, and reverts once none is", async () => {
      await ds.runMigrations();
      await undoThrough("WidenPensionPercentPrecision1795460000000");
      await undoThrough("SavingsRowsNotEssential1795450000000");
      await insert("Take-home pay", "take_home");
      await expect(ds.undoLastMigration()).rejects.toThrow(LINK_KIND_DOWN_REFUSAL);
      expect(await applied()).toContain(NAME);
      await ds.query("UPDATE budget_entries SET link_kind = NULL");
      await ds.undoLastMigration();
      expect(await applied()).not.toContain(NAME);
      const cols: unknown[] = await ds.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_entries' AND column_name = 'link_kind'",
      );
      expect(cols).toEqual([]);
    });
  });

  describe("WidenPensionPercentPrecision1795460000000 (owner item B)", () => {
    const NAME = "WidenPensionPercentPrecision1795460000000";
    const rates = (): Promise<unknown[]> =>
      ds.query(
        "SELECT pension_percent::text AS own, pension_employer_percent::text AS employer FROM user_profiles",
      );

    it("keeps four decimal places, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      // £100 a month on £37,260: 1,200 / 37,260 = 3.2206% to four places.
      await ds.query(
        "INSERT INTO user_profiles (user_id, pension_percent, pension_employer_percent) VALUES ('u1', 3.2206, 100)",
      );
      expect(await rates()).toEqual([{ own: "3.2206", employer: "100.0000" }]);
      await runUpInTransaction(new WidenPensionPercentPrecision1795460000000());
      expect(await rates()).toEqual([{ own: "3.2206", employer: "100.0000" }]);
    });

    it("rounds back to two places on revert", async () => {
      await ds.runMigrations();
      await ds.query(
        "INSERT INTO user_profiles (user_id, pension_percent, pension_employer_percent) VALUES ('u1', 3.2206, 4.005)",
      );
      await undoThrough(NAME);
      // round(3.2206, 2) = 3.22; round(4.005, 2) = 4.01 (half away from zero).
      expect(await rates()).toEqual([{ own: "3.22", employer: "4.01" }]);
    });
  });

  describe("PensionAnswersNullable1795480000000 (slice 6, owner decision 3)", () => {
    const NAME = "PensionAnswersNullable1795480000000";
    const answers = (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, pension_percent::text AS own, pension_employer_percent::text AS employer,
                is_salary_sacrifice AS sacrifice
         FROM user_profiles ORDER BY user_id`,
      );

    it("stores a new profile's pension answers as null, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('u1')");
      const unanswered = [{ user_id: "u1", own: null, employer: null, sacrifice: null }];
      expect(await answers()).toEqual(unanswered);
      await runUpInTransaction(new PensionAnswersNullable1795480000000());
      expect(await answers()).toEqual(unanswered);
    });

    it("on revert fills nulls with 5, 3 and false and restores the defaults and NOT NULL", async () => {
      await ds.runMigrations();
      await ds.query(
        "INSERT INTO user_profiles (user_id, pension_percent, pension_employer_percent, is_salary_sacrifice) VALUES ('u1', NULL, NULL, NULL), ('u2', 6, 4, true)",
      );
      await undoThrough(NAME);
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('u3')");
      expect(await answers()).toEqual([
        { user_id: "u1", own: "5.0000", employer: "3.0000", sacrifice: false },
        { user_id: "u2", own: "6.0000", employer: "4.0000", sacrifice: true },
        { user_id: "u3", own: "5.0000", employer: "3.0000", sacrifice: false },
      ]);
      await expect(
        ds.query("INSERT INTO user_profiles (user_id, pension_percent) VALUES ('u4', NULL)"),
      ).rejects.toThrow(/not-null|null value/i);
    });
  });

  describe("ClearDefaultPensionRates1795480100000 (slice 6, owner decision 3)", () => {
    const NAME = "ClearDefaultPensionRates1795480100000";
    const answers = (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, pension_percent::text AS own, pension_employer_percent::text AS employer,
                is_salary_sacrifice AS sacrifice
         FROM user_profiles ORDER BY user_id`,
      );
    const imageRows = async (): Promise<number> =>
      (await ds.query("SELECT count(*)::int AS n FROM pension_rates_backfill"))[0].n;
    const imageExists = async (): Promise<boolean> =>
      (await ds.query("SELECT to_regclass('public.pension_rates_backfill') IS NOT NULL AS t"))[0].t;
    /** The migration with its clock set, so each side of the cutoff is tested without mocking time. */
    const withClock = (now: string): ClearDefaultPensionRates1795480100000 => {
      const migration = new ClearDefaultPensionRates1795480100000();
      migration.now = new Date(now);
      return migration;
    };
    const BEFORE_CUTOFF = "2026-12-31T23:59:59Z";

    // Undone so its body can be run directly with a set clock (the chain's own run used the real date).
    const seed = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await imageExists()).toBe(false);
      await ds.query(
        `INSERT INTO user_profiles (user_id, pension_percent, pension_employer_percent, is_salary_sacrifice)
         VALUES ('a-default-off', 5, 3, false), ('b-default-on', 5, 3, true),
                ('c-six-three', 6, 3, true), ('d-five-four', 5, 4, false)`,
      );
    };
    const UNTOUCHED = [
      { user_id: "a-default-off", own: "5.0000", employer: "3.0000", sacrifice: false },
      { user_id: "b-default-on", own: "5.0000", employer: "3.0000", sacrifice: true },
      { user_id: "c-six-three", own: "6.0000", employer: "3.0000", sacrifice: true },
      { user_id: "d-five-four", own: "5.0000", employer: "4.0000", sacrifice: false },
    ];

    it("before the cutoff clears every 5/3 pair and its flag, and keeps any other pair", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await answers()).toEqual([
        { user_id: "a-default-off", own: null, employer: null, sacrifice: null },
        { user_id: "b-default-on", own: null, employer: null, sacrifice: null },
        UNTOUCHED[2],
        UNTOUCHED[3],
      ]);
      expect(await imageRows()).toBe(2);
    });

    it("on or after the cutoff changes nothing, and still marks itself as run", async () => {
      await seed();
      await runUpInTransaction(withClock(PENSION_DEFAULTS_CLEAR_BEFORE));
      expect(await answers()).toEqual(UNTOUCHED);
      expect(await imageExists()).toBe(true);
      expect(await imageRows()).toBe(0);
      // A later run, even with a clock before the cutoff, has run once and changes nothing.
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await answers()).toEqual(UNTOUCHED);
    });

    it("runs once: a second run keeps a 5/3 answer saved since", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query(
        "INSERT INTO user_profiles (user_id, pension_percent, pension_employer_percent, is_salary_sacrifice) VALUES ('e-chosen-later', 5, 3, false)",
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await answers()).toContainEqual({
        user_id: "e-chosen-later",
        own: "5.0000",
        employer: "3.0000",
        sacrifice: false,
      });
      expect(await imageRows()).toBe(2);
    });

    it("down restores the old values where all three are still null, keeps a newer answer, and drops the image", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      // b answers 7% after the clear: that answer is the person's and stays.
      await ds.query("UPDATE user_profiles SET pension_percent = 7 WHERE user_id = 'b-default-on'");
      await runMigrationDown(new ClearDefaultPensionRates1795480100000());
      expect(await answers()).toEqual([
        UNTOUCHED[0],
        { user_id: "b-default-on", own: "7.0000", employer: null, sacrifice: null },
        UNTOUCHED[2],
        UNTOUCHED[3],
      ]);
      expect(await imageExists()).toBe(false);
      // Down after a skipped run (no image) also works.
      await runMigrationDown(new ClearDefaultPensionRates1795480100000());
    });

    it("its image rows go with the profile", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query("DELETE FROM user_profiles WHERE user_id = 'a-default-off'");
      expect(await imageRows()).toBe(1);
    });
  });

  describe("StudentLoanPlanToProfile1795480200000 (slice 6)", () => {
    const NAME = "StudentLoanPlanToProfile1795480200000";
    const plans = (): Promise<unknown[]> =>
      ds.query("SELECT user_id, student_loan_plans FROM user_profiles ORDER BY user_id");
    const loan = (userId: string, type: string, plan: string | null): Promise<unknown> =>
      ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, student_loan_plan) VALUES ($1, 'Loan', $2, -1000, $3)`,
        [userId, type, plan],
      );

    it("copies account plans into unanswered profiles only, in plan order, and a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await ds.query(
        `INSERT INTO user_profiles (user_id, student_loan_plans)
         VALUES ('a-null', NULL), ('b-no-loan', ''), ('c-plan-1', 'PLAN_1'), ('d-two', NULL), ('e-none', NULL)`,
      );
      await loan("a-null", "Student Loan", "PLAN_2");
      await loan("b-no-loan", "Student Loan", "PLAN_2");
      await loan("c-plan-1", "Student Loan", "PLAN_2");
      await loan("d-two", "Student Loan", "POSTGRAD");
      await loan("d-two", "Student Loan", "PLAN_1");
      await loan("d-two", "Student Loan", "PLAN_1");
      // Not a Student Loan account, and a Student Loan with no plan: neither counts.
      await loan("e-none", "Loan", "PLAN_4");
      await loan("e-none", "Student Loan", null);

      await ds.runMigrations();
      const after = [
        { user_id: "a-null", student_loan_plans: "PLAN_2" },
        { user_id: "b-no-loan", student_loan_plans: "" },
        { user_id: "c-plan-1", student_loan_plans: "PLAN_1" },
        // Distinct, in the order PLAN_1, PLAN_2, PLAN_4, PLAN_5, POSTGRAD.
        { user_id: "d-two", student_loan_plans: "PLAN_1,POSTGRAD" },
        { user_id: "e-none", student_loan_plans: null },
      ];
      expect(await plans()).toEqual(after);
      await runUpInTransaction(new StudentLoanPlanToProfile1795480200000());
      expect(await plans()).toEqual(after);
      expect(
        (await ds.query("SELECT count(*)::int AS n FROM student_loan_plan_backfill"))[0].n,
      ).toBe(2);
      // The account's own plan is untouched.
      expect(
        await ds.query("SELECT student_loan_plan FROM accounts WHERE user_id = 'a-null'"),
      ).toEqual([{ student_loan_plan: "PLAN_2" }]);
    });

    it("down puts back null where the copied value still stands, and drops the image", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await ds.query(
        "INSERT INTO user_profiles (user_id, student_loan_plans) VALUES ('a-null', NULL), ('d-changed', NULL)",
      );
      await loan("a-null", "Student Loan", "PLAN_2");
      await loan("d-changed", "Student Loan", "PLAN_1");
      await ds.runMigrations();
      // d answers again after the copy: kept on revert.
      await ds.query(
        "UPDATE user_profiles SET student_loan_plans = 'PLAN_5' WHERE user_id = 'd-changed'",
      );
      await undoThrough(NAME);
      expect(await plans()).toEqual([
        { user_id: "a-null", student_loan_plans: null },
        { user_id: "d-changed", student_loan_plans: "PLAN_5" },
      ]);
      expect(
        (await ds.query("SELECT to_regclass('public.student_loan_plan_backfill') AS t"))[0].t,
      ).toBeNull();
    });
  });

  describe("RemovePayeSalaryRecords1795480300000 (slice 6)", () => {
    const NAME = "RemovePayeSalaryRecords1795480300000";
    const salaries = (): Promise<unknown[]> =>
      ds.query("SELECT user_id, annual_salary::text AS salary FROM user_profiles ORDER BY user_id");
    const records = (): Promise<unknown[]> =>
      ds.query(
        `SELECT id, user_id, type, source, category, name, amount::text AS amount, frequency,
                date::text AS date, end_date::text AS end_date, notes,
                created_at::text AS created_at, updated_at::text AS updated_at,
                receipt_filename, receipt_mime_type, receipt_data
         FROM tax_records ORDER BY user_id, name`,
      );
    const record = (
      userId: string,
      category: string,
      name: string,
      amount: number,
      frequency: string,
      date: string,
      receipt: string | null = null,
    ): Promise<unknown> =>
      ds.query(
        `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date, notes,
                                  receipt_filename, receipt_mime_type, receipt_data, created_at)
         VALUES ($1, 'income', 'paye', $2, $3, $4, $5, $6::text::date, 'note', $7, $8, $9, $6::text::timestamptz)`,
        [
          userId,
          category,
          name,
          amount,
          frequency,
          date,
          receipt ? "p60.pdf" : null,
          receipt ? "application/pdf" : null,
          receipt,
        ],
      );

    const seed = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await ds.query(
        `INSERT INTO user_profiles (user_id, annual_salary) VALUES
           ('e1-empty', NULL), ('e2-saved', 58000), ('e3-monthly', NULL),
           ('e4-receipt', NULL), ('e5-one-off', NULL), ('e6-zero', 0)`,
      );
      // e1: the latest yearly record (2026-04-06, £40,000) is copied; both go.
      await record("e1-empty", "paye_salary", "Pay 2025", 35000, "annual", "2025-04-06");
      await record("e1-empty", "paye_salary", "Pay 2026", 40000, "annual", "2026-04-06");
      // Another PAYE category is not a salary record and stays.
      await record("e1-empty", "paye_tax", "Tax paid", 6486, "annual", "2026-04-06");
      // e2: a saved salary wins; the record still goes.
      await record("e2-saved", "paye_salary", "Pay", 60000, "annual", "2026-04-06");
      // e3: monthly £3,000 x 12 = £36,000.
      await record("e3-monthly", "paye_salary", "Pay", 3000, "monthly", "2026-04-06");
      // e4: carries a receipt, so it is neither copied nor deleted.
      await record("e4-receipt", "paye_salary", "Pay", 50000, "annual", "2026-04-06", "cipher");
      // e5: a one-off payslip is not a year's salary; it goes, nothing is copied.
      await record("e5-one-off", "paye_salary", "Payslip", 2500, "one-off", "2026-04-30");
      // e6: a salary saved as 0 counts as empty, as the engine reads it: £40,000 is copied.
      await record("e6-zero", "paye_salary", "Pay", 40000, "annual", "2026-04-06");
      // A user with no profile: left alone.
      await record("ghost", "paye_salary", "Pay", 30000, "annual", "2026-04-06");
    };

    it("copies the latest yearly or monthly record into an empty salary and removes the records", async () => {
      await seed();
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      const afterSalaries = [
        { user_id: "e1-empty", salary: "40000.00" },
        { user_id: "e2-saved", salary: "58000.00" },
        { user_id: "e3-monthly", salary: "36000.00" },
        { user_id: "e4-receipt", salary: null },
        { user_id: "e5-one-off", salary: null },
        { user_id: "e6-zero", salary: "40000.00" },
      ];
      expect(await salaries()).toEqual(afterSalaries);
      const left = (await records()) as { user_id: string; category: string }[];
      expect(left.map((r) => [r.user_id, r.category])).toEqual([
        ["e1-empty", "paye_tax"],
        ["e4-receipt", "paye_salary"],
        ["ghost", "paye_salary"],
      ]);
      const image: { record: Record<string, unknown>; salary_copied: string | null }[] =
        await ds.query(
          "SELECT record, salary_copied::text AS salary_copied FROM paye_salary_record_backfill",
        );
      expect(image).toHaveLength(6);
      expect(
        image
          .map((r) => r.salary_copied)
          .filter(Boolean)
          .sort(),
      ).toEqual(["36000.00", "40000.00", "40000.00"]);
      // Never a receipt column in the image.
      for (const row of image)
        expect(Object.keys(row.record).some((k) => k.startsWith("receipt"))).toBe(false);

      await runUpInTransaction(new RemovePayeSalaryRecords1795480300000());
      expect(await salaries()).toEqual(afterSalaries);
      expect(await records()).toHaveLength(3);
    });

    it("down brings the records back exactly and empties only a salary still equal to the copy", async () => {
      await seed();
      const before = await records();
      await ds.runMigrations();
      // e3 changes the copied salary afterwards: kept on revert.
      await ds.query("UPDATE user_profiles SET annual_salary = 37000 WHERE user_id = 'e3-monthly'");
      await undoThrough(NAME);
      expect(await records()).toEqual(before);
      expect(await salaries()).toEqual([
        { user_id: "e1-empty", salary: null },
        { user_id: "e2-saved", salary: "58000.00" },
        { user_id: "e3-monthly", salary: "37000.00" },
        { user_id: "e4-receipt", salary: null },
        { user_id: "e5-one-off", salary: null },
        // The exact old value comes back: 0, not null.
        { user_id: "e6-zero", salary: "0.00" },
      ]);
      expect(
        (await ds.query("SELECT to_regclass('public.paye_salary_record_backfill') AS t"))[0].t,
      ).toBeNull();
    });
  });

  describe("system audit slice 4: accounts as the home for homes and loans", () => {
    const FIRST = "AddAccountLinkAndRepaymentType1795470000000";
    const LAST = "BackfillFirstHistoryRow1795470300000";
    /** All migrations, then slice 4's undone, so a test seeds the schema slice 4 meets. */
    const beforeSlice4 = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(FIRST);
    };
    const addAccount = async (
      user: string,
      name: string,
      type: string,
      balance: number,
      createdAt = "2026-11-10T12:00:00Z",
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user, name, type, balance, createdAt],
      );
      return at(rows, 0).id;
    };
    const accountRow = async (id: string): Promise<Record<string, unknown>> =>
      at(
        await ds.query<Array<Record<string, unknown>>>(
          `SELECT name, type, account_subtype, linked_account_id, repayment_type, balance::float AS balance,
                  ownership, share_percent FROM accounts WHERE id = $1`,
          [id],
        ),
        0,
      );

    it("migration 1 adds the link with ON DELETE SET NULL and the repayment type CHECK; down drops both", async () => {
      await ds.runMigrations();
      const home = await addAccount("u1", "Home", "Property", 300000);
      const mortgage = await addAccount("u1", "Mortgage", "Mortgage", -200000);
      await ds.query("UPDATE accounts SET linked_account_id = $1 WHERE id = $2", [home, mortgage]);
      await expect(
        ds.query("UPDATE accounts SET repayment_type = 'part-and-part' WHERE id = $1", [mortgage]),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        ds.query("UPDATE accounts SET linked_account_id = id WHERE id = $1", [mortgage]),
      ).rejects.toThrow(/check constraint/i);
      await ds.query("DELETE FROM accounts WHERE id = $1", [home]);
      expect((await accountRow(mortgage)).linked_account_id).toBeNull();
      await runUpInTransaction(new AddAccountLinkAndRepaymentType1795470000000());
      await undoThrough(FIRST);
      const cols: unknown[] = await ds.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name IN ('linked_account_id', 'repayment_type')",
      );
      expect(cols).toEqual([]);
    });

    it("migration 2 saves kinds, links one-of-each pairs and copies the repayment type; down restores", async () => {
      await beforeSlice4();
      await ds.query(
        "INSERT INTO user_profiles (user_id, mortgage_type, housing_status) VALUES ('u1', 'interest-only', 'mortgage'), ('u2', 'repayment', 'mortgage')",
      );
      const home = await addAccount("u1", "Home", "Property", 310000);
      const flat = await addAccount("u1", "Flat 2 BTL", "Property", 200000);
      const mortgage = await addAccount("u1", "Mortgage", "Mortgage", -186000);
      const btlLoan = await addAccount("u1", "Buy-to-let mortgage", "Mortgage", -150000);
      // u2 has two properties neither named buy to let: no way to tell the home, so no kind.
      const a = await addAccount("u2", "Home", "Property", 250000);
      const b = await addAccount("u2", "Cottage", "Property", 150000);
      const u2Mortgage = await addAccount("u2", "Mortgage", "Mortgage", -100000);
      // u3 has no profile row: no repayment type to copy.
      const u3Mortgage = await addAccount("u3", "Mortgage", "Mortgage", -90000);

      await ds.runMigrations();
      expect(await accountRow(home)).toMatchObject({ account_subtype: "home" });
      expect(await accountRow(flat)).toMatchObject({ account_subtype: "rental" });
      expect(await accountRow(mortgage)).toMatchObject({
        account_subtype: "residential_mortgage",
        linked_account_id: home,
        repayment_type: "interest-only",
      });
      // The buy-to-let tab was never used (no balance or rate saved), so its default is not copied.
      expect(await accountRow(btlLoan)).toMatchObject({
        account_subtype: "btl_mortgage",
        linked_account_id: flat,
        repayment_type: null,
      });
      expect((await accountRow(a)).account_subtype).toBeNull();
      expect((await accountRow(b)).account_subtype).toBeNull();
      expect(await accountRow(u2Mortgage)).toMatchObject({
        account_subtype: "residential_mortgage",
        linked_account_id: null,
        repayment_type: "repayment",
      });
      expect(await accountRow(u3Mortgage)).toMatchObject({ repayment_type: null });

      // A second run changes nothing.
      const before = await ds.query("SELECT count(*)::int AS n FROM account_home_backfill");
      await runUpInTransaction(new BackfillPropertyKindAndMortgageLink1795470100000());
      expect(await ds.query("SELECT count(*)::int AS n FROM account_home_backfill")).toEqual(
        before,
      );

      await undoThrough("BackfillPropertyKindAndMortgageLink1795470100000");
      for (const id of [home, flat, mortgage, btlLoan, u2Mortgage]) {
        expect(await accountRow(id)).toMatchObject({
          account_subtype: null,
          linked_account_id: null,
          repayment_type: null,
        });
      }
      const table: Array<{ t: string | null }> = await ds.query(
        "SELECT to_regclass('public.account_home_backfill') AS t",
      );
      expect(table[0]?.t).toBeNull();
    });

    it("migrations 2 and 3 run cleanly once slice 9 has dropped the buy-to-let columns, taking no figure from them", async () => {
      // The columns-present path is every other test in this block (beforeSlice4 restores them).
      await ds.runMigrations();
      const gone: unknown[] = await ds.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name LIKE 'buy_to_let%'",
      );
      expect(gone).toEqual([]);
      await ds.query(
        "INSERT INTO user_profiles (user_id, mortgage_type, housing_status) VALUES ('u7', 'interest-only', 'mortgage')",
      );
      const flat = await addAccount("u7", "BTL flat", "Property", 200000);
      const btlLoan = await addAccount("u7", "BTL mortgage", "Mortgage", -120000);
      await ds.query("UPDATE accounts SET account_subtype = 'btl_mortgage' WHERE id = $1", [
        btlLoan,
      ]);
      const before: unknown[] = await ds.query("SELECT count(*)::int AS n FROM accounts");

      await runUpInTransaction(new BackfillPropertyKindAndMortgageLink1795470100000());
      await runUpInTransaction(new MoveBuyToLetProfileIntoAccounts1795470200000());

      // The name test still applies; the repayment type is never taken from a dropped column.
      expect((await accountRow(flat)).account_subtype).toBe("rental");
      expect((await accountRow(btlLoan)).repayment_type).toBeNull();
      expect(await ds.query("SELECT count(*)::int AS n FROM accounts")).toEqual(before);
    });

    it("migration 3 moves buy-to-let profile figures into linked accounts; down deletes exactly those", async () => {
      await beforeSlice4();
      await ds.query(
        `INSERT INTO user_profiles (user_id, buy_to_let_property_value, buy_to_let_mortgage_balance,
           buy_to_let_mortgage_rate, buy_to_let_mortgage_type, property_ownership_share)
         VALUES ('u4', 235000, 150000, 4.5, 'interest-only', 50),
                ('u5', 180000, NULL, NULL, 'interest-only', 100)`,
      );
      // u5 already has a rental (by name), so nothing new is added for them.
      const existing = await addAccount("u5", "BTL flat", "Property", 180000);
      await ds.runMigrations();

      const u4: Array<Record<string, unknown>> = await ds.query(
        `SELECT id, name, type, account_subtype, linked_account_id, repayment_type, balance::float AS balance,
                interest_rate::float AS rate, ownership, share_percent
           FROM accounts WHERE user_id = 'u4' ORDER BY type DESC`,
      );
      const property = at(u4, 0);
      expect(property).toMatchObject({
        name: "Buy-to-let property",
        type: "Property",
        account_subtype: "rental",
        balance: 235000,
        ownership: "joint",
        share_percent: 50,
      });
      expect(at(u4, 1)).toMatchObject({
        name: "Buy-to-let mortgage",
        type: "Mortgage",
        account_subtype: "btl_mortgage",
        balance: -150000,
        rate: 4.5,
        repayment_type: "interest-only",
        linked_account_id: property.id,
        ownership: "joint",
        share_percent: 50,
      });
      const u5: unknown[] = await ds.query("SELECT id FROM accounts WHERE user_id = 'u5'");
      expect(u5).toEqual([{ id: existing }]);

      // Idempotent: a second run adds nothing.
      await runUpInTransaction(new MoveBuyToLetProfileIntoAccounts1795470200000());
      expect(
        await ds.query("SELECT count(*)::int AS n FROM accounts WHERE user_id = 'u4'"),
      ).toEqual([{ n: 2 }]);

      await undoThrough("MoveBuyToLetProfileIntoAccounts1795470200000");
      expect(await ds.query("SELECT id FROM accounts WHERE user_id = 'u4'")).toEqual([]);
      expect(await ds.query("SELECT id FROM accounts WHERE user_id = 'u5'")).toEqual([
        { id: existing },
      ]);
    });

    it("migration 3 skips a user whose rental may already exist, and an unlinked mortgage keeps the profile share", async () => {
      await beforeSlice4();
      await ds.query(
        `INSERT INTO user_profiles (user_id, buy_to_let_property_value, buy_to_let_mortgage_balance,
           buy_to_let_mortgage_rate, buy_to_let_mortgage_type, property_ownership_share)
         VALUES ('u7', 200000, 120000, 4, 'interest-only', 100),
                ('u8', NULL, 90000, 3.5, 'repayment', 50)`,
      );
      // u7: two properties neither named buy to let, so migration 2 leaves both without a kind;
      // "Leeds flat" may be the rental, so no copy is added.
      await addAccount("u7", "Home", "Property", 300000);
      await addAccount("u7", "Leeds flat", "Property", 200000);
      await ds.runMigrations();
      expect(
        await ds.query("SELECT name FROM accounts WHERE user_id = 'u7' ORDER BY name"),
      ).toEqual([{ name: "Home" }, { name: "Leeds flat" }]);
      // u8: no property value, so the mortgage cannot be linked; it takes the profile's 50%.
      expect(
        await ds.query(
          "SELECT linked_account_id, ownership, share_percent FROM accounts WHERE user_id = 'u8'",
        ),
      ).toEqual([{ linked_account_id: null, ownership: "joint", share_percent: 50 }]);
    });

    it("migration 2 takes a renter's only property, with buy-to-let figures, as the rental; migration 3 adds no copy", async () => {
      await beforeSlice4();
      // Renter: one property "Leeds flat" at 200,000 and the same 200,000 on the old buy-to-let
      // tab. Net worth must count it once: 200,000, not 400,000.
      await ds.query(
        `INSERT INTO user_profiles (user_id, housing_status, buy_to_let_property_value)
         VALUES ('r1', 'renting', 200000), ('r2', 'renting', NULL)`,
      );
      const flat = await addAccount("r1", "Leeds flat", "Property", 200000);
      // r2: one property and neither signal, so it stays without a kind.
      const other = await addAccount("r2", "Cottage", "Property", 150000);
      await ds.runMigrations();
      expect((await accountRow(flat)).account_subtype).toBe("rental");
      expect((await accountRow(other)).account_subtype).toBeNull();
      const total: Array<{ total: number }> = await ds.query(
        "SELECT sum(balance)::float AS total FROM accounts WHERE user_id = 'r1' AND type = 'Property'",
      );
      expect(total).toEqual([{ total: 200000 }]);
    });

    it("migration 2 takes a renter's only unnamed mortgage, with buy-to-let figures, as the buy-to-let one; migration 3 adds no copy", async () => {
      await beforeSlice4();
      await ds.query(
        `INSERT INTO user_profiles (user_id, housing_status, buy_to_let_mortgage_balance, buy_to_let_mortgage_rate)
         VALUES ('r3', 'renting', 120000, 4)`,
      );
      const loan = await addAccount("r3", "Mortgage", "Mortgage", -120000);
      await ds.runMigrations();
      expect((await accountRow(loan)).account_subtype).toBe("btl_mortgage");
      expect(
        await ds.query("SELECT count(*)::int AS n FROM accounts WHERE user_id = 'r3'"),
      ).toEqual([{ n: 1 }]);
    });

    it("an owner with a home and buy-to-let figures keeps the home and gains the rental and its mortgage", async () => {
      await beforeSlice4();
      await ds.query(
        `INSERT INTO user_profiles (user_id, housing_status, mortgage_type, buy_to_let_property_value,
           buy_to_let_mortgage_balance, buy_to_let_mortgage_rate, buy_to_let_mortgage_type)
         VALUES ('o1', 'mortgage', 'repayment', 235000, 150000, 5, 'interest-only')`,
      );
      const home = await addAccount("o1", "Home", "Property", 310000);
      const homeLoan = await addAccount("o1", "Mortgage", "Mortgage", -186000);
      await ds.runMigrations();
      expect(await accountRow(home)).toMatchObject({ account_subtype: "home" });
      expect(await accountRow(homeLoan)).toMatchObject({
        account_subtype: "residential_mortgage",
        linked_account_id: home,
        repayment_type: "repayment",
      });
      const added: Array<Record<string, unknown>> = await ds.query(
        `SELECT name, account_subtype, balance::float AS balance FROM accounts
          WHERE user_id = 'o1' AND id NOT IN ($1, $2) ORDER BY name`,
        [home, homeLoan],
      );
      expect(added).toEqual([
        { name: "Buy-to-let mortgage", account_subtype: "btl_mortgage", balance: -150000 },
        { name: "Buy-to-let property", account_subtype: "rental", balance: 235000 },
      ]);
    });

    it("migration 2 sets no repayment type when a user has more than one residential mortgage", async () => {
      await beforeSlice4();
      await ds.query(
        "INSERT INTO user_profiles (user_id, housing_status, mortgage_type) VALUES ('o2', 'mortgage', 'interest-only')",
      );
      const first = await addAccount("o2", "Main", "Mortgage", -100000);
      const second = await addAccount("o2", "Further advance", "Mortgage", -20000);
      await ds.runMigrations();
      expect((await accountRow(first)).repayment_type).toBeNull();
      expect((await accountRow(second)).repayment_type).toBeNull();
    });

    it("migration 4 records an account created after its newest month, so the balance sync keeps today's figure", async () => {
      await beforeSlice4();
      // Added in August at 1,000 with no row; July was back-dated later at 900.
      const saver = await addAccount("u9", "Saver", "Saving", 1000, "2026-08-10T12:00:00Z");
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, 'u9', 2026, 7, 900, '2026-07-31', 'manual')`,
        [saver],
      );
      await ds.runMigrations();
      const rows: Array<{ month: number; value: number; source: string }> = await ds.query(
        "SELECT month, value::float AS value, source FROM account_details WHERE account_id = $1 ORDER BY month",
        [saver],
      );
      expect(rows).toEqual([
        { month: 7, value: 900, source: "manual" },
        { month: 8, value: 1000, source: "backfill" },
      ]);
      await runUpInTransaction(new BackfillFirstHistoryRow1795470300000());
      expect(
        await ds.query("SELECT count(*)::int AS n FROM account_details WHERE account_id = $1", [
          saver,
        ]),
      ).toEqual([{ n: 2 }]);
    });

    it("migration 4 gives each account without history a row in the London month it was added; down removes them", async () => {
      await beforeSlice4();
      // 30 Sep 2026 23:30 UTC is 1 Oct 00:30 in London (BST), so the row is October's.
      const added = await addAccount("u6", "Saver", "Saving", 5000, "2026-09-30T23:30:00Z");
      const card = await addAccount("u6", "Card", "Credit Card", -300, "2026-11-02T09:00:00Z");
      const recorded = await addAccount("u6", "Current", "Current", 900, "2026-08-01T09:00:00Z");
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, 'u6', 2026, 8, 900, '2026-08-31', 'manual')`,
        [recorded],
      );
      await ds.runMigrations();
      const rows: Array<Record<string, unknown>> = await ds.query(
        `SELECT account_id, year, month, value::float AS value, to_char(as_of_date, 'YYYY-MM-DD') AS as_of, source
           FROM account_details ORDER BY account_id, year, month`,
      );
      const byAccount = (id: string) => rows.filter((r) => r.account_id === id);
      expect(byAccount(added)).toEqual([
        {
          account_id: added,
          year: 2026,
          month: 10,
          value: 5000,
          as_of: "2026-10-01",
          source: "backfill",
        },
      ]);
      expect(byAccount(card)).toEqual([
        {
          account_id: card,
          year: 2026,
          month: 11,
          value: -300,
          as_of: "2026-11-02",
          source: "backfill",
        },
      ]);
      expect(byAccount(recorded)).toHaveLength(1);

      await runUpInTransaction(new BackfillFirstHistoryRow1795470300000());
      expect(await ds.query("SELECT count(*)::int AS n FROM account_details")).toEqual([{ n: 3 }]);

      // A back-filled row the user corrected since is theirs, and stays on revert.
      await ds.query(
        "UPDATE account_details SET value = 5100, source = 'manual' WHERE account_id = $1",
        [added],
      );
      await undoThrough(LAST);
      const left: Array<{ account_id: string }> = await ds.query(
        "SELECT account_id FROM account_details ORDER BY account_id",
      );
      expect(left.map((r) => r.account_id).sort()).toEqual([added, recorded].sort());
    });
  });
  describe("LinkBudgetLinesToAccounts1795490000000 (audit slice 5)", () => {
    const NAME = "LinkBudgetLinesToAccounts1795490000000";
    const account = async (
      userId: string,
      type: string,
      monthly: number | null,
      share: { ownership: string; sharePercent: number | null } = {
        ownership: "sole",
        sharePercent: null,
      },
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, monthly_contribution, currency, ownership, share_percent)
         VALUES ($1, 'Account', $2, $3, $4, 'GBP', $5, $6) RETURNING id`,
        // Liabilities are stored as negative balances (LiabilitySignRule).
        [
          userId,
          type,
          type === "Saving" ? 1000 : -1000,
          monthly,
          share.ownership,
          share.sharePercent,
        ],
      );
      return at(rows, 0).id;
    };
    const line = async (
      userId: string,
      kind: string | null,
      accountId: string | null,
      category = kind === "debt" ? "debt" : "savings",
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, is_income, is_essential, link_kind, link_account_id)
         VALUES ($1, $2, 'Line', 0, false, false, $3, $4) RETURNING id`,
        [userId, category, kind, accountId],
      );
      return at(rows, 0).id;
    };
    const lineRow = async (id: string): Promise<Record<string, unknown>> =>
      at(
        await ds.query(
          "SELECT amount::text AS amount, frequency, ownership, link_kind FROM budget_entries WHERE id = $1",
          [id],
        ),
        0,
      );

    it("links a line to the same user's account only, one line per account, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      const saver = await account("u1", "Saving", 500);
      const loan = await account("u1", "Loan", 180);
      const theirs = await account("u2", "Saving", 300);
      await line("u1", "savings", saver);
      await line("u1", "debt", loan);
      await ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, is_income, is_essential, link_kind)
         VALUES ('u1', 'income', 'Take-home pay', 0, true, true, 'take_home')`,
      );
      // Another user's account: the composite foreign key refuses it whatever the service does,
      // even when that user has linked it, so the refusal never reads as "already in use".
      await line("u2", "savings", theirs);
      await expect(line("u1", "savings", theirs)).rejects.toThrow(/foreign key/i);
      // One line per account.
      await expect(line("u1", "savings", saver)).rejects.toThrow(/unique|duplicate/i);
      // Only a savings or debt line names an account.
      const spare = await account("u1", "Saving", 20);
      await expect(line("u1", "take_home", spare, "income")).rejects.toThrow(/check constraint/i);
      await expect(line("u1", null, spare)).rejects.toThrow(/check constraint/i);
      await runUpInTransaction(new LinkBudgetLinesToAccounts1795490000000());
      const rows: { n: string }[] = await ds.query(
        "SELECT count(*)::text AS n FROM budget_entries WHERE link_kind IS NOT NULL",
      );
      expect(rows[0]?.n).toBe("4");
    });

    it("keeps the line, linked and with no account, when its account is deleted", async () => {
      await ds.runMigrations();
      const saver = await account("u1", "Saving", 500);
      const id = await line("u1", "savings", saver);
      await ds.query("DELETE FROM accounts WHERE id = $1", [saver]);
      const rows: { link_kind: string; link_account_id: string | null; user_id: string }[] =
        await ds.query(
          "SELECT link_kind, link_account_id, user_id FROM budget_entries WHERE id = $1",
          [id],
        );
      // Only link_account_id is cleared: the engine then reads the line as Not set.
      expect(rows).toEqual([{ link_kind: "savings", link_account_id: null, user_id: "u1" }]);
    });

    it("writes each resolvable line's figure into amount before dropping the column", async () => {
      await ds.runMigrations();
      const sole = await line("u1", "savings", await account("u1", "Saving", 500));
      const joint = await line(
        "u1",
        "savings",
        await account("u1", "Saving", 500, { ownership: "joint", sharePercent: 40 }),
      );
      const jointNoShare = await line(
        "u1",
        "debt",
        await account("u1", "Credit Card", 300, { ownership: "joint", sharePercent: null }),
      );
      const noAmount = await line("u1", "debt", await account("u1", "Loan", null));
      const changedType = await line("u1", "savings", await account("u1", "Saving", 75));
      await ds.query("UPDATE accounts SET type = 'Current' WHERE monthly_contribution = 75");
      const deleted = await line("u1", "savings", await account("u1", "Saving", 60));
      await ds.query("DELETE FROM accounts WHERE monthly_contribution = 60");

      await undoThrough(NAME);

      // 500 sole = 500. 500 x 40% = 200. A joint account with no share counts at 50%: 300 x 50% = 150.
      expect(await lineRow(sole)).toEqual({
        amount: "500.00",
        frequency: "monthly",
        ownership: "sole",
        link_kind: null,
      });
      expect(await lineRow(joint)).toMatchObject({
        amount: "200.00",
        ownership: "sole",
        link_kind: null,
      });
      expect(await lineRow(jointNoShare)).toMatchObject({ amount: "150.00", link_kind: null });
      // Not set before (no saved amount, type changed, account deleted): nothing to write.
      for (const id of [noAmount, changedType, deleted]) {
        expect(await lineRow(id)).toMatchObject({ amount: "0.00", link_kind: null });
      }
      const cols: unknown[] = await ds.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_entries' AND column_name = 'link_account_id'",
      );
      expect(cols).toEqual([]);
      // The earlier check is back: only the two profile kinds.
      await expect(
        ds.query(
          `INSERT INTO budget_entries (user_id, category, name, amount, link_kind) VALUES ('u1', 'savings', 'Line', 0, 'savings')`,
        ),
      ).rejects.toThrow(/check constraint/i);
    });
  });
  describe("RentLinesWholeRent1795490100000 (audit slice 5, the housing line)", () => {
    const NAME = "RentLinesWholeRent1795490100000";
    const profile = (userId: string, status: string) =>
      ds.query("INSERT INTO user_profiles (user_id, housing_status) VALUES ($1, $2)", [
        userId,
        status,
      ]);
    const line = async (
      userId: string,
      linkKind: string | null,
      ownership: string,
      share: number | null,
    ) => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO budget_entries (user_id, category, name, amount, link_kind, ownership, share_percent)
         VALUES ($1, 'housing', 'Rent', 0, $2, $3, $4) RETURNING id`,
        [userId, linkKind, ownership, share],
      );
      return at(rows, 0).id;
    };
    const share = async (id: string) =>
      at(
        await ds.query("SELECT ownership, share_percent FROM budget_entries WHERE id = $1", [id]),
        0,
      );

    it("sets a renter's joint linked rent line to sole, keeps the rest, and a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("renter", "renting");
      await profile("owner", "mortgage");
      // Before this change the saved rent was the person's own share and the line's share was
      // ignored, so £600 saved on a joint 50% line counted £600. Now the line's share applies, so
      // the line is made sole to keep £600.
      const renterLinked = await line("renter", "housing", "joint", 50);
      const renterTyped = await line("renter", null, "joint", 50);
      const ownerLinked = await line("owner", "housing", "joint", 50);
      const logged = vi.spyOn(Logger.prototype, "log");
      await ds.runMigrations();
      // Counts only: one line changed, and no id in the message.
      expect(logged).toHaveBeenCalledWith("Renters' joint linked rent lines set to sole: 1");
      logged.mockRestore();
      expect(await applied()).toContain(NAME);
      expect(await share(renterLinked)).toEqual({ ownership: "sole", share_percent: null });
      // A typed row's share always counted, and a mortgage line's share is never read: unchanged.
      expect(await share(renterTyped)).toEqual({ ownership: "joint", share_percent: 50 });
      expect(await share(ownerLinked)).toEqual({ ownership: "joint", share_percent: 50 });
      // A share set after the migration is the person's choice: a second run leaves it.
      await ds.query(
        "UPDATE budget_entries SET ownership = 'joint', share_percent = 40 WHERE id = $1",
        [renterLinked],
      );
      await runUpInTransaction(new RentLinesWholeRent1795490100000());
      expect(await share(renterLinked)).toEqual({ ownership: "joint", share_percent: 40 });
    });

    it("puts each changed line's share back on revert", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("renter", "renting");
      const renterLinked = await line("renter", "housing", "joint", 30);
      await ds.runMigrations();
      expect(await share(renterLinked)).toEqual({ ownership: "sole", share_percent: null });
      await undoThrough(NAME);
      expect(await share(renterLinked)).toEqual({ ownership: "joint", share_percent: 30 });
      const tables: unknown[] = await ds.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'rent_share_backfill'",
      );
      expect(tables).toEqual([]);
    });
  });

  describe("AccountDetailsOwnerKey1795510000000 (audit slice 9, DB-14)", () => {
    const NAME = "AccountDetailsOwnerKey1795510000000";
    const account = async (userId: string): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency) VALUES ($1, 'Account', 'Saving', 100, 'GBP') RETURNING id`,
        [userId],
      );
      return at(rows, 0).id;
    };
    const history = (accountId: string, userId: string, month = 1) =>
      ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, 2026, $3, 100, make_date(2026, $3, 1), 'manual')`,
        [accountId, userId, month],
      );
    const ownerKey = async (): Promise<Array<{ convalidated: boolean }>> =>
      ds.query(
        `SELECT convalidated FROM pg_constraint WHERE conname = '${OWNER_KEY}' AND conrelid = 'account_details'::regclass`,
      );

    it("refuses a history row naming another user, cascades a delete, and a second run changes nothing", async () => {
      const logged = vi.spyOn(Logger.prototype, "log");
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      // Counts only, no id.
      expect(logged).toHaveBeenCalledWith(
        "History rows whose user differs from their account's: 0",
      );
      logged.mockRestore();
      expect(await ownerKey()).toEqual([{ convalidated: true }]);
      const mine = await account("u1");
      await history(mine, "u1");
      await expect(history(mine, "u2", 2)).rejects.toThrow(/foreign key/i);
      await runUpInTransaction(new AccountDetailsOwnerKey1795510000000());
      expect(await ownerKey()).toEqual([{ convalidated: true }]);
      await ds.query("DELETE FROM accounts WHERE id = $1", [mine]);
      expect(await ds.query("SELECT 1 FROM account_details")).toEqual([]);
    });

    it("with a mismatched row already stored, changes no row and checks new and changed rows only", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      const mine = await account("u1");
      await history(mine, "u2");
      const logged = vi.spyOn(Logger.prototype, "log");
      const warned = vi.spyOn(Logger.prototype, "warn");
      await ds.runMigrations();
      expect(logged).toHaveBeenCalledWith(
        "History rows whose user differs from their account's: 1",
      );
      expect(warned).toHaveBeenCalledWith(
        `${OWNER_KEY} left NOT VALID: new and changed rows are checked, existing rows are unchanged`,
      );
      logged.mockRestore();
      warned.mockRestore();
      expect(await applied()).toContain(NAME);
      expect(await ownerKey()).toEqual([{ convalidated: false }]);
      // The stored row is untouched, and a change to its value alone still saves.
      await ds.query("UPDATE account_details SET value = 150 WHERE account_id = $1", [mine]);
      expect(await ds.query("SELECT user_id, value::text AS value FROM account_details")).toEqual([
        { user_id: "u2", value: "150.00" },
      ]);
      // A new row, or moving a row to another user, is refused.
      await expect(history(mine, "u3", 2)).rejects.toThrow(/foreign key/i);
      await expect(
        ds.query("UPDATE account_details SET user_id = 'u3' WHERE account_id = $1", [mine]),
      ).rejects.toThrow(/foreign key/i);
    });

    it("down removes the key and nothing else", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await ownerKey()).toEqual([]);
      const index: unknown[] = await ds.query(
        "SELECT 1 FROM pg_indexes WHERE indexname = 'UQ_accounts_id_user_id'",
      );
      expect(index).toHaveLength(1);
      const mine = await account("u1");
      await history(mine, "u2");
    });
  });

  describe("AccountTypeCheck1795510100000 (audit slice 9, DB-6)", () => {
    const NAME = "AccountTypeCheck1795510100000";
    const account = async (type: string): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency) VALUES ('u1', 'Account', $1, 0, 'GBP') RETURNING id`,
        [type],
      );
      return at(rows, 0).id;
    };
    const check = (): Promise<unknown[]> =>
      ds.query(
        `SELECT 1 FROM pg_constraint WHERE conname = '${ACCOUNT_TYPE_CHECK}' AND conrelid = 'accounts'::regclass`,
      );

    it("accepts each of the eleven types, refuses any other spelling, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await check()).toHaveLength(1);
      for (const type of ACCOUNT_TYPES_AT_1795510100000) await account(type);
      for (const type of ["savings", "Savings", "ISA", " Current", ""]) {
        await expect(account(type), type).rejects.toThrow(/check constraint/i);
      }
      await runUpInTransaction(new AccountTypeCheck1795510100000());
      expect(await check()).toHaveLength(1);
      const count: Array<{ n: string }> = await ds.query(
        "SELECT count(*)::text AS n FROM accounts",
      );
      expect(count[0]?.n).toBe("11");
    });

    it("with an off-list type stored, adds nothing, changes no row, returns cleanly, and a re-run after the fix adds the check", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      const odd = await account("savings");
      await account("Current Account");
      await account("savings");
      const logged = vi.spyOn(Logger.prototype, "log");
      const warned = vi.spyOn(Logger.prototype, "warn");
      // The deploy and every migration behind this one go on.
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(logged).toHaveBeenCalledWith("Accounts with a type outside the eleven: 3");
      // Distinct type names only, no id.
      expect(warned).toHaveBeenCalledWith(
        `${ACCOUNT_TYPE_SKIPPED} Off-list types: "Current Account", "savings"`,
      );
      logged.mockRestore();
      warned.mockRestore();
      expect(await check()).toEqual([]);
      expect(await ds.query("SELECT type FROM accounts WHERE id = $1", [odd])).toEqual([
        { type: "savings" },
      ]);
      // The row still saves, since no check was added.
      await ds.query("UPDATE accounts SET balance = 5 WHERE id = $1", [odd]);
      // A second run with the rows still off-list skips again.
      await runUpInTransaction(new AccountTypeCheck1795510100000());
      expect(await check()).toEqual([]);
      // Once the rows are dealt with, running it again adds the check.
      await ds.query("UPDATE accounts SET type = 'Saving' WHERE type = 'savings'");
      await ds.query("UPDATE accounts SET type = 'Current' WHERE type = 'Current Account'");
      await runUpInTransaction(new AccountTypeCheck1795510100000());
      expect(await check()).toHaveLength(1);
    });

    it("logs at most ten off-list type names", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      for (let i = 0; i < 12; i++) await account(`odd ${String(i).padStart(2, "0")}`);
      const warned = vi.spyOn(Logger.prototype, "warn");
      await runUpInTransaction(new AccountTypeCheck1795510100000());
      const line = String(warned.mock.calls.at(-1)?.[0] ?? "");
      warned.mockRestore();
      expect(line.match(/"odd \d\d"/g)).toHaveLength(10);
    });

    it("down removes the check", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await check()).toEqual([]);
      await account("savings");
    });
  });

  describe("slice 9 profile column drops (audit slice 9, decision 12)", () => {
    const FIRST = at(DROPPED_PROFILE_COLUMNS, 0).migration;
    // A value other than the column's default for each dropped column, as Postgres prints it.
    const SET: Record<string, string> = {
      has_buy_to_let: "true",
      buy_to_let_count: "2",
      buy_to_let_property_value: "165000.50",
      buy_to_let_monthly_rental: "875.00",
      buy_to_let_mortgage_balance: "92000.00",
      buy_to_let_mortgage_rate: "5.10",
      buy_to_let_mortgage_type: "repayment",
      monthly_savings_target: "300.00",
      savings_allocation_mode: "total",
      savings_default_interest_rate: "4.25",
      dashboard_widget_sizes: '{"accounts":"wide"}',
      dashboard_widget_config: "{}",
    };
    const NAMES = DROPPED_PROFILE_COLUMNS.map((c) => c.column);
    const definitions = (): Promise<unknown[]> =>
      ds.query(
        `SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'user_profiles' AND column_name = ANY($1) ORDER BY column_name`,
        [NAMES],
      );
    const values = async (userId: string): Promise<Record<string, string | null>> => {
      const rows: Record<string, string | null>[] = await ds.query(
        `SELECT ${NAMES.map((n) => `"${n}"::text AS "${n}"`).join(", ")} FROM user_profiles WHERE user_id = $1`,
        [userId],
      );
      return at(rows, 0);
    };
    const imageRows = async (): Promise<
      Array<{ user_id: string; column_name: string; old_value: string }>
    > =>
      ds.query(
        `SELECT p.user_id, b.column_name, b.old_value FROM "${PROFILE_COLUMN_DROP_TABLE}" b
         JOIN user_profiles p ON p.id = b.profile_id ORDER BY p.user_id, b.column_name`,
      );
    const imageTable = (): Promise<unknown[]> =>
      ds.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1",
        [PROFILE_COLUMN_DROP_TABLE],
      );
    // Undoes every drop, then stores one profile with every column set and one left at defaults.
    const seedBeforeDrops = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(FIRST);
      await ds.query(
        `INSERT INTO user_profiles (user_id, ${NAMES.map((n) => `"${n}"`).join(", ")})
         VALUES ('set', ${NAMES.map((_, i) => `$${i + 1}`).join(", ")})`,
        NAMES.map((n) => SET[n]),
      );
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('defaults')");
    };

    it("lists each of the twelve retired columns once, each in its own migration", () => {
      expect(new Set(NAMES).size).toBe(12);
      expect([...NAMES].sort()).toEqual(Object.keys(SET).sort());
      expect(new Set(DROPPED_PROFILE_COLUMNS.map((c) => c.migration)).size).toBe(12);
      for (const { migration } of DROPPED_PROFILE_COLUMNS) {
        expect(MIGRATIONS.map((m) => m.name)).toContain(migration);
      }
    });

    it("drops each column after copying every value that differs from its default; a second run changes nothing", async () => {
      await seedBeforeDrops();
      const logged = vi.spyOn(Logger.prototype, "log");
      await ds.runMigrations();
      for (const { column, migration } of DROPPED_PROFILE_COLUMNS) {
        expect(await applied()).toContain(migration);
        // Counts only: no id and no value.
        expect(logged).toHaveBeenCalledWith(
          `user_profiles.${column} dropped; values kept in the before-image: 1`,
        );
      }
      logged.mockRestore();
      expect(await definitions()).toEqual([]);
      // The profile at defaults has nothing to keep: re-adding the column restores its default.
      expect(await imageRows()).toEqual(
        [...NAMES].sort().map((n) => ({ user_id: "set", column_name: n, old_value: SET[n] })),
      );

      const drops = MIGRATIONS.filter((m) =>
        DROPPED_PROFILE_COLUMNS.some((c) => c.migration === m.name),
      );
      expect(drops).toHaveLength(12);
      for (const migration of drops) {
        await runUpInTransaction(
          new migration() as { up: (qr: import("typeorm").QueryRunner) => Promise<void> },
        );
      }
      expect(await definitions()).toEqual([]);
      expect(await imageRows()).toHaveLength(12);
    });

    it("down re-adds each column as it was and puts every value back; the before-image goes with the last down", async () => {
      await seedBeforeDrops();
      const shapeBefore = await definitions();
      expect(shapeBefore).toHaveLength(12);
      const defaultsBefore = await values("defaults");
      expect(await values("set")).toEqual(SET);

      await ds.runMigrations();
      // A profile created after the drop gets each column's default when it comes back.
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('after')");
      await undoThrough(FIRST);

      expect(await definitions()).toEqual(shapeBefore);
      expect(await values("set")).toEqual(SET);
      expect(await values("defaults")).toEqual(defaultsBefore);
      expect(await values("after")).toEqual(defaultsBefore);
      expect(await imageTable()).toEqual([]);

      // And up runs again from there.
      await ds.runMigrations();
      expect(await definitions()).toEqual([]);
      expect(await imageRows()).toHaveLength(12);
      expect(await tables()).toEqual(ENTITY_TABLES);
    });

    it("undoing one drop restores only that column and keeps the other copies", async () => {
      await seedBeforeDrops();
      await ds.runMigrations();
      const last = at(DROPPED_PROFILE_COLUMNS, DROPPED_PROFILE_COLUMNS.length - 1);
      await undoThrough(last.migration);
      const restored: Array<{ v: string }> = await ds.query(
        `SELECT "${last.column}"::text AS v FROM user_profiles WHERE user_id = 'set'`,
      );
      expect(restored).toEqual([{ v: SET[last.column] }]);
      const left = await imageRows();
      expect(left).toHaveLength(11);
      expect(left.map((r) => r.column_name)).not.toContain(last.column);
    });

    it("a deleted profile takes its before-image rows with it", async () => {
      await seedBeforeDrops();
      await ds.runMigrations();
      await ds.query("DELETE FROM user_profiles WHERE user_id = 'set'");
      expect(await imageRows()).toEqual([]);
    });
  });

  describe("SetupChecklistDismissed1795500100000 (audit slice 8, decision 13)", () => {
    const NAME = "SetupChecklistDismissed1795500100000";
    const dismissedColumn = async (): Promise<unknown[]> =>
      ds.query(
        `SELECT data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_name = 'user_profiles' AND column_name = 'setup_checklist_dismissed'`,
      );
    const dismissed = async (userId: string): Promise<boolean> => {
      const rows: { setup_checklist_dismissed: boolean }[] = await ds.query(
        "SELECT setup_checklist_dismissed FROM user_profiles WHERE user_id = $1",
        [userId],
      );
      return at(rows, 0).setup_checklist_dismissed;
    };

    it("adds a not-null flag that reads false for every existing profile; a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await dismissedColumn()).toEqual([]);
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('before')");

      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await dismissedColumn()).toEqual([
        { data_type: "boolean", is_nullable: "NO", column_default: "false" },
      ]);
      // The browser held the dismissal before, so no profile starts dismissed.
      expect(await dismissed("before")).toBe(false);

      await ds.query(
        "UPDATE user_profiles SET setup_checklist_dismissed = true WHERE user_id = 'before'",
      );
      await runUpInTransaction(new SetupChecklistDismissed1795500100000());
      expect(await dismissed("before")).toBe(true);
    });

    it("drops the flag on revert, and up runs again", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await dismissedColumn()).toEqual([]);
      await ds.runMigrations();
      expect(await dismissedColumn()).toHaveLength(1);
      expect(await tables()).toEqual(ENTITY_TABLES);
    });
  });

  describe("BackfillMortgageRepaymentType1795530000000 (slice 4 rule 4 again, residential)", () => {
    const NAME = "BackfillMortgageRepaymentType1795530000000";
    const profile = (user: string, mortgageType: string): Promise<unknown> =>
      ds.query("INSERT INTO user_profiles (user_id, mortgage_type) VALUES ($1, $2)", [
        user,
        mortgageType,
      ]);
    const mortgage = async (
      user: string,
      subtype: string | null,
      repaymentType: string | null = null,
      name = "Mortgage",
    ): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, account_subtype, repayment_type)
         VALUES ($1, $2, 'Mortgage', -100000, $3, $4) RETURNING id`,
        [user, name, subtype, repaymentType],
      );
      return at(rows, 0).id;
    };
    const types = (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, account_subtype, repayment_type FROM accounts
         WHERE type = 'Mortgage' ORDER BY user_id, account_subtype NULLS FIRST, name`,
      );
    const imageCount = async (): Promise<number> =>
      (await ds.query("SELECT count(*)::int AS n FROM mortgage_repayment_type_backfill"))[0].n;

    it("fills only a user's sole residential mortgage from the profile; a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      // Filled: the only residential mortgage, by kind or (no kind, not named buy to let) as the
      // engine reads it, and one beside a buy-to-let mortgage, which does not count.
      await profile("a-sole", "interest-only");
      await mortgage("a-sole", "residential_mortgage");
      await profile("b-no-kind", "interest-only");
      await mortgage("b-no-kind", null, null, "Nationwide");
      await profile("c-with-btl", "repayment");
      await mortgage("c-with-btl", "residential_mortgage");
      await mortgage("c-with-btl", "btl_mortgage");
      // Left alone: two residential mortgages (no way to tell which the profile described), a
      // buy-to-let mortgage by kind or by name, and a mortgage that already has a type.
      await profile("d-two", "interest-only");
      await mortgage("d-two", "residential_mortgage", null, "First");
      await mortgage("d-two", null, null, "Second");
      await profile("e-btl", "interest-only");
      await mortgage("e-btl", "btl_mortgage");
      await profile("f-btl-name", "interest-only");
      await mortgage("f-btl-name", null, null, "BTL flat");
      await profile("g-typed", "interest-only");
      await mortgage("g-typed", "residential_mortgage", "repayment");
      // No profile: nothing to copy.
      await mortgage("h-no-profile", "residential_mortgage");

      await ds.runMigrations();
      const after = [
        {
          user_id: "a-sole",
          account_subtype: "residential_mortgage",
          repayment_type: "interest-only",
        },
        { user_id: "b-no-kind", account_subtype: null, repayment_type: "interest-only" },
        { user_id: "c-with-btl", account_subtype: "btl_mortgage", repayment_type: null },
        {
          user_id: "c-with-btl",
          account_subtype: "residential_mortgage",
          repayment_type: "repayment",
        },
        { user_id: "d-two", account_subtype: null, repayment_type: null },
        { user_id: "d-two", account_subtype: "residential_mortgage", repayment_type: null },
        { user_id: "e-btl", account_subtype: "btl_mortgage", repayment_type: null },
        { user_id: "f-btl-name", account_subtype: null, repayment_type: null },
        {
          user_id: "g-typed",
          account_subtype: "residential_mortgage",
          repayment_type: "repayment",
        },
        { user_id: "h-no-profile", account_subtype: "residential_mortgage", repayment_type: null },
      ];
      expect(await types()).toEqual(after);
      expect(await imageCount()).toBe(3);

      await runUpInTransaction(new BackfillMortgageRepaymentType1795530000000());
      expect(await types()).toEqual(after);
      expect(await imageCount()).toBe(3);
    });

    it("down puts back null where the copied value still stands, keeps a later answer, and drops the image", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("a-copied", "interest-only");
      const copied = await mortgage("a-copied", "residential_mortgage");
      await profile("b-changed", "interest-only");
      const changed = await mortgage("b-changed", "residential_mortgage");
      await ds.runMigrations();
      // b answers on the Mortgage page after the copy: kept on revert.
      await ds.query("UPDATE accounts SET repayment_type = 'repayment' WHERE id = $1", [changed]);

      await undoThrough(NAME);
      const typeOf = async (id: string): Promise<unknown> =>
        at(
          await ds.query<Array<{ repayment_type: string | null }>>(
            "SELECT repayment_type FROM accounts WHERE id = $1",
            [id],
          ),
          0,
        ).repayment_type;
      expect(await typeOf(copied)).toBeNull();
      expect(await typeOf(changed)).toBe("repayment");
      expect(
        (await ds.query("SELECT to_regclass('public.mortgage_repayment_type_backfill') AS t"))[0].t,
      ).toBeNull();
      // And up runs again on the reverted schema.
      await ds.runMigrations();
      expect(await typeOf(copied)).toBe("interest-only");
      expect(await tables()).toEqual(ENTITY_TABLES);
  describe("TaxRecordAccountLink1795540000000 (audit slice 7)", () => {
    const NAME = "TaxRecordAccountLink1795540000000";
    const column = (): Promise<unknown[]> =>
      ds.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'tax_records' AND column_name = 'account_id'",
      );
    const key = (): Promise<unknown[]> =>
      ds.query(`SELECT 1 FROM pg_constraint WHERE conname = '${TAX_RECORD_ACCOUNT_FOREIGN_KEY}'`);
    const indexes = async (): Promise<string[]> =>
      (
        (await ds.query(
          `SELECT indexname FROM pg_indexes WHERE tablename = 'tax_records' AND indexname IN ($1, $2) ORDER BY indexname`,
          [TAX_RECORD_ACCOUNT_USER_INDEX, TAX_RECORD_USER_ACCOUNT_INDEX],
        )) as { indexname: string }[]
      ).map((r) => r.indexname);
    const account = async (userId: string): Promise<string> =>
      at<{ id: string }>(
        await ds.query(
          `INSERT INTO accounts (user_id, name, type, account_subtype, balance, currency)
           VALUES ($1, 'Let flat', 'Property', 'rental', 0, 'GBP') RETURNING id`,
          [userId],
        ),
        0,
      ).id;
    const record = async (userId: string, accountId: string | null): Promise<string> =>
      at<{ id: string }>(
        await ds.query(
          `INSERT INTO tax_records (user_id, type, source, category, name, amount, date, account_id)
           VALUES ($1, 'income', 'rental', 'rental_income', 'Rent', 100, '2026-05-01', $2) RETURNING id`,
          [userId, accountId],
        ),
        0,
      ).id;
    const linkOf = async (id: string) =>
      at<{ account_id: string | null }>(
        await ds.query("SELECT account_id FROM tax_records WHERE id = $1", [id]),
        0,
      ).account_id;

    it("adds the column, the owner key and both indexes, and a second run changes nothing", async () => {
      await ds.runMigrations();
      expect(await applied()).toContain(NAME);
      expect(await column()).toHaveLength(1);
      expect(await key()).toHaveLength(1);
      expect(await indexes()).toEqual([
        TAX_RECORD_ACCOUNT_USER_INDEX,
        TAX_RECORD_USER_ACCOUNT_INDEX,
      ]);
      const mine = await account("u1");
      const linked = await record("u1", mine);
      const before = await columns();
      await runUpInTransaction(new TaxRecordAccountLink1795540000000());
      expect(await columns()).toEqual(before);
      expect(await key()).toHaveLength(1);
      expect(await linkOf(linked)).toBe(mine);
    });

    it("refuses another user's account and unlinks a record when its account is deleted", async () => {
      await ds.runMigrations();
      const theirs = await account("u2");
      await expect(record("u1", theirs)).rejects.toThrow(/foreign key/i);
      const mine = await account("u1");
      const linked = await record("u1", mine);
      await ds.query("DELETE FROM accounts WHERE id = $1", [mine]);
      // The record stays, keeps its user, and is no longer linked.
      expect(
        at(
          await ds.query("SELECT user_id, account_id FROM tax_records WHERE id = $1", [linked]),
          0,
        ),
      ).toEqual({ user_id: "u1", account_id: null });
    });

    it("drops the indexes, the key and the column on revert, keeping the records", async () => {
      await ds.runMigrations();
      const linked = await record("u1", await account("u1"));
      await undoThrough(NAME);
      expect(await column()).toEqual([]);
      expect(await key()).toEqual([]);
      expect(await indexes()).toEqual([]);
      expect(await ds.query("SELECT id FROM tax_records")).toEqual([{ id: linked }]);
      // Up again after down: back to the full shape.
      await ds.runMigrations();
      expect(await column()).toHaveLength(1);
      expect(await key()).toHaveLength(1);
    });
  });

  describe("RentalShareOntoPropertyAccounts1795540100000 (audit slice 7, decision 6)", () => {
    const NAME = "RentalShareOntoPropertyAccounts1795540100000";
    const profile = (userId: string, share: number) =>
      ds.query("INSERT INTO user_profiles (user_id, property_ownership_share) VALUES ($1, $2)", [
        userId,
        share,
      ]);
    const property = async (
      userId: string,
      subtype: string,
      ownership: string,
      share: number | null,
    ): Promise<string> =>
      at<{ id: string }>(
        await ds.query(
          `INSERT INTO accounts (user_id, name, type, account_subtype, balance, currency, ownership, share_percent)
           VALUES ($1, 'Property', 'Property', $2, 0, 'GBP', $3, $4) RETURNING id`,
          [userId, subtype, ownership, share],
        ),
        0,
      ).id;
    const share = async (id: string) =>
      at(await ds.query("SELECT ownership, share_percent FROM accounts WHERE id = $1", [id]), 0);
    const beforeImage = async (): Promise<unknown[]> =>
      ds.query(
        `SELECT account_id, user_id, old_ownership, old_share_percent FROM "${RENTAL_SHARE_BACKFILL_TABLE}" ORDER BY account_id`,
      );

    it("gives a sole rental the profile's share, leaves the rest, and a second run changes nothing", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("half", 50);
      await profile("whole", 100);
      // "none" has no profile row at all.
      await profile("thirds", 33.4);
      const soleRental = await property("half", "rental", "sole", null);
      const home = await property("half", "home", "sole", null);
      const jointRental = await property("half", "rental", "joint", 40);
      const wholeRental = await property("whole", "rental", "sole", null);
      const noShareRental = await property("none", "rental", "sole", null);
      // 33.4 rounds to 33, as MoveBuyToLetProfileIntoAccounts rounds it.
      const roundedRental = await property("thirds", "rental", "sole", null);
      const logged = vi.spyOn(Logger.prototype, "log");
      await ds.runMigrations();
      // Counts only: two accounts changed, and no id in the message.
      expect(logged).toHaveBeenCalledWith(
        "Sole rental property accounts given the profile's share: 2",
      );
      logged.mockRestore();
      expect(await applied()).toContain(NAME);
      expect(await share(soleRental)).toEqual({ ownership: "joint", share_percent: 50 });
      expect(await share(roundedRental)).toEqual({ ownership: "joint", share_percent: 33 });
      expect(await share(home)).toEqual({ ownership: "sole", share_percent: null });
      expect(await share(jointRental)).toEqual({ ownership: "joint", share_percent: 40 });
      expect(await share(wholeRental)).toEqual({ ownership: "sole", share_percent: null });
      expect(await share(noShareRental)).toEqual({ ownership: "sole", share_percent: null });
      const image = await beforeImage();
      expect(image).toHaveLength(2);
      expect(image).toEqual(
        expect.arrayContaining([
          {
            account_id: soleRental,
            user_id: "half",
            old_ownership: "sole",
            old_share_percent: null,
          },
          {
            account_id: roundedRental,
            user_id: "thirds",
            old_ownership: "sole",
            old_share_percent: null,
          },
        ]),
      );
      // A share set after the migration is the person's choice: a second run leaves it.
      await ds.query("UPDATE accounts SET ownership = 'sole', share_percent = NULL WHERE id = $1", [
        soleRental,
      ]);
      await runUpInTransaction(new RentalShareOntoPropertyAccounts1795540100000());
      expect(await share(soleRental)).toEqual({ ownership: "sole", share_percent: null });
      expect(await beforeImage()).toHaveLength(2);
    });

    it("puts each changed account's ownership back on revert and drops the before-image", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("half", 50);
      const soleRental = await property("half", "rental", "sole", null);
      await ds.runMigrations();
      expect(await share(soleRental)).toEqual({ ownership: "joint", share_percent: 50 });
      await undoThrough(NAME);
      expect(await share(soleRental)).toEqual({ ownership: "sole", share_percent: null });
      const tables: unknown[] = await ds.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = '${RENTAL_SHARE_BACKFILL_TABLE}'`,
      );
      expect(tables).toEqual([]);
    });

    it("drops the before-image row with its account", async () => {
      await ds.runMigrations();
      await undoThrough(NAME);
      await profile("half", 50);
      const soleRental = await property("half", "rental", "sole", null);
      await ds.runMigrations();
      expect(await beforeImage()).toHaveLength(1);
      await ds.query("DELETE FROM accounts WHERE id = $1", [soleRental]);
      expect(await beforeImage()).toEqual([]);
    });
  });

  describe("ClearTakeHomeSalaries1795530100000 (old onboarding wrote take-home x 12 as salary)", () => {
    const NAME = "ClearTakeHomeSalaries1795530100000";
    const BEFORE_CUTOFF = "2026-12-31T23:59:59Z";
    const pay = (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, annual_salary::text AS salary, monthly_take_home::text AS take_home
         FROM user_profiles ORDER BY user_id`,
      );
    const imageRows = async (): Promise<number> =>
      (await ds.query("SELECT count(*)::int AS n FROM take_home_salary_backfill"))[0].n;
    const imageExists = async (): Promise<boolean> =>
      (await ds.query("SELECT to_regclass('public.take_home_salary_backfill') IS NOT NULL AS t"))[0]
        .t;
    const withClock = (now: string): ClearTakeHomeSalaries1795530100000 => {
      const migration = new ClearTakeHomeSalaries1795530100000();
      migration.now = new Date(now);
      return migration;
    };
    // Worked by hand: 2,500 x 12 = 30,000 (> 12,570, cleared); 1,000 x 12 = 12,000 and
    // 1,047.50 x 12 = 12,570 (at or below the personal allowance, ambiguous, kept); 30,000 with
    // take-home 1,993.00 is a gross salary (1,993 x 12 = 23,916, not 30,000), kept.
    const seed = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await imageExists()).toBe(false);
      await ds.query(
        `INSERT INTO user_profiles (user_id, annual_salary, monthly_take_home)
         VALUES ('a-take-home', 30000, 2500), ('b-low', 12000, 1000), ('c-allowance', 12570, 1047.50),
                ('d-gross', 30000, 1993.00), ('e-no-take-home', 30000, NULL)`,
      );
    };
    const UNTOUCHED = [
      { user_id: "a-take-home", salary: "30000.00", take_home: "2500.00" },
      { user_id: "b-low", salary: "12000.00", take_home: "1000.00" },
      { user_id: "c-allowance", salary: "12570.00", take_home: "1047.50" },
      { user_id: "d-gross", salary: "30000.00", take_home: "1993.00" },
      { user_id: "e-no-take-home", salary: "30000.00", take_home: null },
    ];
    const CLEARED = [
      { user_id: "a-take-home", salary: null, take_home: "2500.00" },
      ...UNTOUCHED.slice(1),
    ];

    it("clears a salary that is take-home x 12 above 12,570 and keeps the take-home", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await pay()).toEqual(CLEARED);
      expect(await imageRows()).toBe(1);
    });

    it("clears a pair a penny above the threshold: 1,047.51 x 12 = 12,570.12 > 12,570", async () => {
      await seed();
      await ds.query(
        "INSERT INTO user_profiles (user_id, annual_salary, monthly_take_home) VALUES ('f-just-above', 12570.12, 1047.51)",
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      const [row] = await ds.query(
        "SELECT annual_salary AS salary, monthly_take_home AS take_home FROM user_profiles WHERE user_id = 'f-just-above'",
      );
      expect(row).toEqual({ salary: null, take_home: "1047.51" });
      expect(await imageRows()).toBe(2);
    });

    it("on or after the cutoff changes nothing, and still marks itself as run", async () => {
      await seed();
      await runUpInTransaction(withClock(TAKE_HOME_SALARY_CLEAR_BEFORE));
      expect(await pay()).toEqual(UNTOUCHED);
      expect(await imageExists()).toBe(true);
      expect(await imageRows()).toBe(0);
    });

    it("runs once: a second run changes nothing", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query(
        "INSERT INTO user_profiles (user_id, annual_salary, monthly_take_home) VALUES ('f-later', 36000, 3000)",
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await pay()).toEqual([
        ...CLEARED,
        { user_id: "f-later", salary: "36000.00", take_home: "3000.00" },
      ]);
      expect(await imageRows()).toBe(1);
    });

    it("down restores the salary where it is still null with the same take-home, keeps one saved since, and drops the image", async () => {
      await seed();
      await ds.query(
        `INSERT INTO user_profiles (user_id, annual_salary, monthly_take_home)
         VALUES ('g-resaved', 24000, 2000), ('h-new-take-home', 18000, 1500)`,
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await imageRows()).toBe(3);
      // g saves a gross salary after the clear; h changes take-home: both answers are kept.
      await ds.query("UPDATE user_profiles SET annual_salary = 40000 WHERE user_id = 'g-resaved'");
      await ds.query(
        "UPDATE user_profiles SET monthly_take_home = 1600 WHERE user_id = 'h-new-take-home'",
      );
      await runMigrationDown(new ClearTakeHomeSalaries1795530100000());
      expect(await pay()).toEqual([
        ...UNTOUCHED.slice(0, 5),
        { user_id: "g-resaved", salary: "40000.00", take_home: "2000.00" },
        { user_id: "h-new-take-home", salary: null, take_home: "1600.00" },
      ]);
      expect(await imageExists()).toBe(false);
      // Down after a skipped run (no image) also works.
      await runMigrationDown(new ClearTakeHomeSalaries1795530100000());
    });

    it("its image rows go with the profile", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query("DELETE FROM user_profiles WHERE user_id = 'a-take-home'");
      expect(await imageRows()).toBe(0);
    });
  });

  describe("ClearResetPensionZeros1795530200000 (old financial data reset wrote 0/0/false)", () => {
    const NAME = "ClearResetPensionZeros1795530200000";
    const BEFORE_CUTOFF = "2026-12-31T23:59:59Z";
    const answers = (): Promise<unknown[]> =>
      ds.query(
        `SELECT user_id, pension_percent::text AS own, pension_employer_percent::text AS employer,
                is_salary_sacrifice AS sacrifice
         FROM user_profiles ORDER BY user_id`,
      );
    const imageRows = async (): Promise<number> =>
      (await ds.query("SELECT count(*)::int AS n FROM reset_pension_zeros_backfill"))[0].n;
    const imageExists = async (): Promise<boolean> =>
      (
        await ds.query("SELECT to_regclass('public.reset_pension_zeros_backfill') IS NOT NULL AS t")
      )[0].t;
    const withClock = (now: string): ClearResetPensionZeros1795530200000 => {
      const migration = new ClearResetPensionZeros1795530200000();
      migration.now = new Date(now);
      return migration;
    };
    const seed = async (): Promise<void> => {
      await ds.runMigrations();
      await undoThrough(NAME);
      expect(await imageExists()).toBe(false);
      await ds.query(
        `INSERT INTO user_profiles (user_id, has_reset_financial_data, pension_percent, pension_employer_percent, is_salary_sacrifice)
         VALUES ('a-reset', true, 0, 0, false), ('b-no-flag', false, 0, 0, false),
                ('c-five', true, 5, 0, false)`,
      );
    };
    const UNTOUCHED = [
      { user_id: "a-reset", own: "0.0000", employer: "0.0000", sacrifice: false },
      { user_id: "b-no-flag", own: "0.0000", employer: "0.0000", sacrifice: false },
      { user_id: "c-five", own: "5.0000", employer: "0.0000", sacrifice: false },
    ];
    const CLEARED = [
      { user_id: "a-reset", own: null, employer: null, sacrifice: null },
      ...UNTOUCHED.slice(1),
    ];

    it("clears 0/0/false on a profile flagged as reset, and keeps the rest", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await answers()).toEqual(CLEARED);
      expect(await imageRows()).toBe(1);
    });

    it("on or after the cutoff changes nothing, and still marks itself as run", async () => {
      await seed();
      await runUpInTransaction(withClock(PENSION_DEFAULTS_CLEAR_BEFORE));
      expect(await answers()).toEqual(UNTOUCHED);
      expect(await imageExists()).toBe(true);
      expect(await imageRows()).toBe(0);
    });

    it("runs once: a second run keeps a 0/0/false answer saved since", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query(
        "UPDATE user_profiles SET pension_percent = 0, pension_employer_percent = 0, is_salary_sacrifice = false WHERE user_id = 'a-reset'",
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await answers()).toEqual(UNTOUCHED);
      expect(await imageRows()).toBe(1);
    });

    it("down restores where all three are still null, keeps an answer saved since, and drops the image", async () => {
      await seed();
      await ds.query(
        `INSERT INTO user_profiles (user_id, has_reset_financial_data, pension_percent, pension_employer_percent, is_salary_sacrifice)
         VALUES ('d-answered', true, 0, 0, false)`,
      );
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      expect(await imageRows()).toBe(2);
      await ds.query("UPDATE user_profiles SET pension_percent = 4 WHERE user_id = 'd-answered'");
      await runMigrationDown(new ClearResetPensionZeros1795530200000());
      expect(await answers()).toEqual([
        ...UNTOUCHED,
        { user_id: "d-answered", own: "4.0000", employer: null, sacrifice: null },
      ]);
      expect(await imageExists()).toBe(false);
      await runMigrationDown(new ClearResetPensionZeros1795530200000());
    });

    it("its image rows go with the profile", async () => {
      await seed();
      await runUpInTransaction(withClock(BEFORE_CUTOFF));
      await ds.query("DELETE FROM user_profiles WHERE user_id = 'a-reset'");
      expect(await imageRows()).toBe(0);
    });
  });
});
