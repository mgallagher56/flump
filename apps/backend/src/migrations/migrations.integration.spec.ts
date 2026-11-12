import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../testing/discoverMigrations";
import { Baseline1794355200000 } from "./Baseline1794355200000";
import { ClearBankTokens1794355300000 } from "./ClearBankTokens1794355300000";
import { DeleteSyncedTransactions1794355500000 } from "./DeleteSyncedTransactions1794355500000";
import {
  RemoveSeededExampleData1794355400000,
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  TAX_FINGERPRINT_SQL,
} from "./RemoveSeededExampleData1794355400000";

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

const ENTITY_TABLES = [
  "account_details",
  "accounts",
  "bank_connections",
  "budget_entries",
  "mcp_tokens",
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
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'migrations' ORDER BY table_name",
    );
    return rows.map((r) => r.table_name);
  };

  const columns = (): Promise<unknown[]> =>
    ds.query(
      "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name <> 'migrations' ORDER BY table_name, column_name",
    );

  // Names, types and nullability per column, plus PRIMARY KEY / UNIQUE column sets.
  const shape = async (): Promise<unknown> => ({
    columns: await ds.query(
      "SELECT table_name, column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name <> 'migrations' ORDER BY table_name, column_name",
    ),
    constraints: await ds.query(
      `SELECT tc.table_name, tc.constraint_type, array_agg(kcu.column_name::text ORDER BY kcu.column_name) AS cols
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public' AND tc.table_name <> 'migrations'
         AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
       GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
       ORDER BY tc.table_name, tc.constraint_type, cols`,
    ),
  });

  const applied = async (): Promise<string[]> => {
    const rows: { name: string }[] = await ds.query("SELECT name FROM migrations ORDER BY id");
    return rows.map((r) => r.name);
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

  it("creates all eight tables on an empty database", async () => {
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
    await ds.runMigrations({ transaction: "all" });
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
        "INSERT INTO account_details (account_id, month, year, value) VALUES ($1, 1, 2024, 5)",
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
          "INSERT INTO account_details (account_id, month, year, value) VALUES ($1, 1, 2024, 5)",
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
});
