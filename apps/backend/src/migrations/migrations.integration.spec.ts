import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { Baseline1794355200000 } from "./Baseline1794355200000";
import { ClearBankTokens1794355300000 } from "./ClearBankTokens1794355300000";

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
      migrations: [Baseline1794355200000, ClearBankTokens1794355300000],
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
    expect(await applied()).toEqual(["Baseline1794355200000", "ClearBankTokens1794355300000"]);
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
    await expect(ds.runMigrations()).resolves.toHaveLength(2);
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
});
