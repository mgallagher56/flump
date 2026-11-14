import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { type Env, resolvePoolConfig } from "./db.config";
import { typeOrmOptionsFromEnv } from "./typeorm.options";

// Pool and session limits (backend audit H8, plan BE-02) against a real Postgres: a request held
// up by a lock, a slow statement or an exhausted pool fails within its limit instead of waiting
// forever. Uses its own temporary table, so it needs no migrations. Skipped like the migration
// suite when TEST_DATABASE_URL is unset (and fails collection in CI when REQUIRE_DB_TESTS=1).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const DEFAULT_LOCK_TIMEOUT_MS = resolvePoolConfig({}).lockTimeoutMillis;

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "database pool limits (real Postgres)",
  () => {
    const open: DataSource[] = [];

    const connect = async (overrides: Env = {}): Promise<DataSource> => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
        ...overrides,
      }) as DataSourceOptions;
      const ds = new DataSource({ ...options, entities: [], migrations: [], migrationsRun: false });
      await ds.initialize();
      open.push(ds);
      return ds;
    };

    afterEach(async () => {
      for (const ds of open.splice(0)) {
        if (ds.isInitialized) await ds.destroy();
      }
    });

    const elapsed = async (
      run: () => Promise<unknown>,
    ): Promise<{ ms: number; error: unknown }> => {
      const start = Date.now();
      try {
        await run();
        return { ms: Date.now() - start, error: undefined };
      } catch (error) {
        return { ms: Date.now() - start, error };
      }
    };

    it("pins the session to UTC and applies the default limits", async () => {
      const ds = await connect();
      const [row] = await ds.query(
        "SELECT current_setting('TimeZone') AS tz, current_setting('statement_timeout') AS statement, current_setting('lock_timeout') AS lock, current_setting('idle_in_transaction_session_timeout') AS idle",
      );
      expect(row).toEqual({ tz: "UTC", statement: "10s", lock: "5s", idle: "30s" });
    });

    it("fails a second request blocked by a held row lock within the default 5 s", async () => {
      const ds = await connect();
      await ds.query("DROP TABLE IF EXISTS pool_lock_probe");
      await ds.query("CREATE TABLE pool_lock_probe (id int PRIMARY KEY, n int NOT NULL)");
      await ds.query("INSERT INTO pool_lock_probe VALUES (1, 0)");

      const holder = ds.createQueryRunner();
      try {
        await holder.startTransaction();
        await holder.query("SELECT * FROM pool_lock_probe WHERE id = 1 FOR UPDATE");

        const { ms, error } = await elapsed(() =>
          ds.query("UPDATE pool_lock_probe SET n = n + 1 WHERE id = 1"),
        );
        expect(String(error)).toMatch(/lock timeout/i);
        expect(ms).toBeGreaterThanOrEqual(DEFAULT_LOCK_TIMEOUT_MS - 100);
        expect(ms).toBeLessThan(DEFAULT_LOCK_TIMEOUT_MS + 1_000);
      } finally {
        await holder.rollbackTransaction();
        await holder.release();
        await ds.query("DROP TABLE IF EXISTS pool_lock_probe");
      }
    }, 15_000);

    it("cancels a statement that runs past DB_STATEMENT_TIMEOUT_MS", async () => {
      const ds = await connect({ DB_STATEMENT_TIMEOUT_MS: "300", DB_LOCK_TIMEOUT_MS: "200" });
      const { ms, error } = await elapsed(() => ds.query("SELECT pg_sleep(5)"));
      expect(String(error)).toMatch(/statement timeout/i);
      expect(ms).toBeLessThan(2_000);
    });

    it("fails a request that waits past DB_POOL_CONNECTION_TIMEOUT_MS for a free connection", async () => {
      const ds = await connect({ DB_POOL_MAX: "1", DB_POOL_CONNECTION_TIMEOUT_MS: "300" });
      const busy = ds.createQueryRunner();
      try {
        await busy.connect(); // takes the only connection
        const { ms, error } = await elapsed(() => ds.query("SELECT 1"));
        expect(String(error)).toMatch(/timeout/i);
        expect(ms).toBeLessThan(2_000);
      } finally {
        await busy.release();
      }
      expect(await ds.query("SELECT 1 AS ok")).toEqual([{ ok: 1 }]);
    });

    it("ends a transaction left idle past DB_IDLE_IN_TRANSACTION_TIMEOUT_MS", async () => {
      const ds = await connect({ DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: "1000" });
      const runner = ds.createQueryRunner();
      try {
        await runner.startTransaction();
        await runner.query("SELECT 1");
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        await expect(runner.query("SELECT 1")).rejects.toThrow();
      } finally {
        await runner.release();
      }
    });
  },
);
