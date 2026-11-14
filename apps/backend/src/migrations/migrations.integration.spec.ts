import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../testing/discoverMigrations";
import { AccountDetailsUserMonthIndex1794357300000 } from "./AccountDetailsUserMonthIndex1794357300000";
import { AddAccountDeletionTombstones1794622492000 } from "./AddAccountDeletionTombstones1794622492000";
import { AddAccountStudentLoanPlanAndCurrencyDefault1794355800000 } from "./AddAccountStudentLoanPlanAndCurrencyDefault1794355800000";
import { AddMortgageTermColumns1794355600000 } from "./AddMortgageTermColumns1794355600000";
import { AddProfileFacts1794355723000 } from "./AddProfileFacts1794355723000";
import { AddUserIdIndexes1794358100000, USER_ID_INDEXES } from "./AddUserIdIndexes1794358100000";
import { BackfillAnnualTaxRecordEndDate1794355900000 } from "./BackfillAnnualTaxRecordEndDate1794355900000";
import { Baseline1794355200000 } from "./Baseline1794355200000";
import { ClearBankTokens1794355300000 } from "./ClearBankTokens1794355300000";
import { DeleteSyncedTransactions1794355500000 } from "./DeleteSyncedTransactions1794355500000";
import {
  RemoveSeededExampleData1794355400000,
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  TAX_FINGERPRINT_SQL,
} from "./RemoveSeededExampleData1794355400000";
import { UniqueAccountDetailMonth1794356000000 } from "./UniqueAccountDetailMonth1794356000000";

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
// comparisons): the BE-05 liability sign before-image (LiabilitySignRule1794358050000).
const MIGRATION_ONLY_TABLES = "'migrations', 'liability_sign_backfill'";

const ENTITY_TABLES = [
  "account_deletion_tombstones",
  "account_details",
  "accounts",
  "agent_audit_events",
  "bank_connections",
  "budget_entries",
  "import_batches",
  "mcp_tokens",
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
      return rows[0].id;
    };

    const fingerprintOf = async (id: string): Promise<string> => {
      const rows: { fp: string }[] = await ds.query(
        `SELECT ${TAX_FINGERPRINT_SQL} AS fp FROM tax_records WHERE id = $1`,
        [id],
      );
      return rows[0].fp;
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
      return rows[0].id;
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
      return rows[0].id;
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
      expect(await fingerprintOf(id)).toBe(expected[0].fp);
    });

    it("deletes untouched seed accounts and keeps edited, connected and populated ones", async () => {
      await prepare();
      const [checking, , , pension] = await insertSeedAccounts("u1");
      const changedBalance = await insertAccount("u2", SEEDED_ACCOUNTS[0], { balance: 2450.76 });
      const [connection]: { id: string }[] = await ds.query(
        `INSERT INTO bank_connections (user_id, institution_id, institution_name) VALUES ('u3', 'i', 'Bank') RETURNING id`,
      );
      const connected = await insertAccount("u3", SEEDED_ACCOUNTS[0], {
        connectionId: connection.id,
      });
      const withDetails = await insertAccount("u4", SEEDED_ACCOUNTS[1]);
      await ds.query(
        "INSERT INTO account_details (account_id, user_id, month, year, value, as_of_date) VALUES ($1, 'u', 1, 2024, 5, '2024-01-31')",
        [withDetails],
      );
      const withTransactions = await insertAccount("u5", SEEDED_ACCOUNTS[2]);
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
        await insertBudget("u1", SEEDED_BUDGET_ENTRIES[0]),
        await insertBudget("u1", SEEDED_BUDGET_ENTRIES[1]),
        await insertBudget("u1", SEEDED_BUDGET_ENTRIES[2]),
        await insertBudget("u1", SEEDED_BUDGET_ENTRIES[3]),
      ];
      const salary = await insertBudget("u1", SEEDED_BUDGET_ENTRIES[14]);
      const notDefault = await insertBudget("u1", SEEDED_BUDGET_ENTRIES[4], false);
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
          ...SEEDED_ACCOUNTS[0],
          name: `Custom ${user}`,
        });
        await ds.query(
          "INSERT INTO account_details (account_id, user_id, month, year, value, as_of_date) VALUES ($1, 'u', 1, 2024, 5, '2024-01-31')",
          [account],
        );
        await ds.query(
          `INSERT INTO transactions (account_id, user_id, amount, description, category) VALUES ($1, $2, 1, 'x', 'y')`,
          [account, user],
        );
        await insertConnections([[user, "tok", "connected"]]);
        await insertBudget(user, SEEDED_BUDGET_ENTRIES[0], false);
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
      const lateAccount = await insertAccount("u2", SEEDED_ACCOUNTS[0]);
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
        return rows[0].id;
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

      const rows = await ds.query(
        `SELECT account_id, user_id, year, month, value::float AS value, as_of_date::text AS as_of_date, source
         FROM account_details ORDER BY user_id, year, month`,
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
      const id = rows[0].id;
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
        [rows[0].id, `tx on ${name}`],
      );
      return rows[0].id;
    };

    const prepare = async (): Promise<string> => {
      await ds.runMigrations();
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
      const conn: { id: string }[] = await ds.query(
        `INSERT INTO bank_connections (user_id, institution_id, institution_name, status)
         VALUES ('u1', 'monzo', 'Monzo', 'connected') RETURNING id`,
      );
      return conn[0].id;
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

    // Back to the state before this migration: no index, migration forgotten.
    const rerun = async (): Promise<void> => {
      await ds.query(`DROP INDEX "${INDEX}"`);
      await ds.query(`DELETE FROM migrations WHERE name = '${MIGRATION}'`);
    };

    it("deletes duplicates keeping the max id per account and month, then creates the index", async () => {
      await ds.runMigrations();
      await rerun();
      await insertDetail("a1", 2026, 1, 100); // dup, oldest
      await insertDetail("a1", 2026, 1, 150); // dup, middle (highest value, not kept)
      await insertDetail("a1", 2026, 1, 120); // dup, max id: kept
      await insertDetail("a1", 2026, 2, 130); // different month
      await insertDetail("a2", 2026, 1, 900); // different account
      const keep: { id: number }[] = await ds.query(
        "SELECT max(id) AS id FROM account_details WHERE account_id = 'a1' AND month = 1",
      );

      await ds.runMigrations();

      const rows = await ds.query(
        "SELECT id, account_id, year, month, value::float AS value FROM account_details ORDER BY account_id, month",
      );
      expect(rows).toEqual([
        { id: keep[0]?.id, account_id: "a1", year: 2026, month: 1, value: 120 },
        { id: expect.any(Number), account_id: "a1", year: 2026, month: 2, value: 130 },
        { id: expect.any(Number), account_id: "a2", year: 2026, month: 1, value: 900 },
      ]);
      expect(await uniqueIndex()).toHaveLength(1);
      expect((await uniqueIndex())[0]?.indexdef).toMatch(
        /UNIQUE INDEX .* \(account_id, year, month\)/,
      );
      await expect(insertDetail("a1", 2026, 2, 1)).rejects.toThrow(/UQ_account_details/);
      expect(await applied()).toContain(MIGRATION);
    });

    it("is idempotent when the index already exists (synchronize-built database)", async () => {
      await ds.synchronize();
      expect(await uniqueIndex()).toHaveLength(1);
      await insertDetail("a1", 2026, 1, 5);
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
      await insertDetail("a1", 2026, 1, 1);
      await insertDetail("a1", 2026, 1, 2);
    });
  });

  describe("AddImportBatchesAndAgentAudit1794356200000 (E17 PR C)", () => {
    const MIGRATION = "AddImportBatchesAndAgentAudit1794356200000";

    const account = async (): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('user-a', 'Acc', 'Current', 10, 'GBP') RETURNING id`,
      );
      return rows[0].id;
    };
    const batch = async (key = "k-1"): Promise<string> => {
      const rows: { id: string }[] = await ds.query(
        `INSERT INTO import_batches (user_id, idempotency_key, payload, counts, validation_errors, expires_at)
         VALUES ('user-a', $1, '{}', '{}', '{}', now() + interval '7 days') RETURNING id`,
        [key],
      );
      return rows[0].id;
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

  describe("SalarySacrificeDefaultFalse1794357400000", () => {
    const MIGRATION = "SalarySacrificeDefaultFalse1794357400000";
    const flag = async (userId: string): Promise<boolean> =>
      (
        await ds.query("SELECT is_salary_sacrifice FROM user_profiles WHERE user_id = $1", [userId])
      )[0].is_salary_sacrifice;

    it("defaults new profiles to false and leaves existing rows untouched; down() restores true", async () => {
      await ds.runMigrations();
      await undoThrough(MIGRATION);
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('before')");
      expect(await flag("before")).toBe(true);

      await ds.runMigrations();
      await ds.query("INSERT INTO user_profiles (user_id) VALUES ('after')");
      expect(await flag("before")).toBe(true);
      expect(await flag("after")).toBe(false);

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
});
