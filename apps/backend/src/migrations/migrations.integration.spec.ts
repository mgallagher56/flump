import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { Baseline1794355200000 } from "./Baseline1794355200000";
import { ClearBankTokens1794355300000 } from "./ClearBankTokens1794355300000";

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

describe.skipIf(!TEST_DATABASE_URL)("migrations (real Postgres)", () => {
  let ds: DataSource;

  beforeEach(async () => {
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
    await ds.query("DROP SCHEMA public CASCADE");
    await ds.query("CREATE SCHEMA public");
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

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

  const applied = async (): Promise<string[]> => {
    const rows: { name: string }[] = await ds.query("SELECT name FROM migrations ORDER BY id");
    return rows.map((r) => r.name);
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
    // Dropping the schema removed the extension that TypeORM installs on connect.
    await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
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

  it("refuses to half-create the schema when only some tables exist", async () => {
    await ds.query('CREATE TABLE "user_profiles" ("id" uuid PRIMARY KEY)');
    await expect(ds.runMigrations()).rejects.toThrow(/partial/i);
    expect(await tables()).toEqual(["user_profiles"]);
  });

  it("clears stored bank tokens and marks connections as errored", async () => {
    await ds.runMigrations();
    await ds.query(
      `INSERT INTO bank_connections (user_id, institution_id, institution_name, access_token, refresh_token, status)
       VALUES ('u1', 'i1', 'Bank A', 'enc-a', 'enc-ra', 'connected'),
              ('u2', 'i2', 'Bank B', 'enc-b', NULL, 'connected')`,
    );

    const runner = ds.createQueryRunner();
    try {
      await new ClearBankTokens1794355300000().up(runner);
    } finally {
      await runner.release();
    }

    const rows = await ds.query("SELECT access_token, refresh_token, status FROM bank_connections");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toEqual({ access_token: null, refresh_token: null, status: "error" });
    }
  });

  it("succeeds with zero bank connections", async () => {
    await expect(ds.runMigrations()).resolves.toHaveLength(2);
    expect(await ds.query("SELECT count(*)::int AS n FROM bank_connections")).toEqual([{ n: 0 }]);
  });
});
