import { Logger } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations } from "../testing/discoverMigrations";
import { PgRateLimitStore, SWEEP_EVERY } from "./pg-rate-limit.store";
import { RATE_LIMIT_POLICIES } from "./rate-limit.decorator";

// BE-07 (M10) on real Postgres: the shared store keeps counts across a restart (a new instance on
// a new connection pool) and two instances (replicas) share one limit. Drops the public schema,
// so a throwaway database only:
//   docker run --rm -d --name flump-pg-test -e POSTGRES_PASSWORD=postgres \
//     -e POSTGRES_DB=flump_rate_limit_test -p 55432:5432 postgres:18-alpine
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_rate_limit_test \
//     bunx vitest run src/security/pg-rate-limit.store.integration.spec.ts

const MINUTE = 60_000;
const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "PgRateLimitStore (real Postgres)",
  () => {
    const savedNodeEnv = process.env.NODE_ENV;
    const pools: DataSource[] = [];

    /** A fresh pool, as a new process or another replica would have. */
    const connect = async (): Promise<DataSource> => {
      const url = process.env.TEST_DATABASE_URL as string;
      const options = typeOrmOptionsFromEnv({ NODE_ENV: "test", DATABASE_URL: url });
      const ds = new DataSource({
        ...(options as DataSourceOptions),
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      pools.push(ds);
      return ds;
    };
    let ds: DataSource;

    beforeAll(async () => {
      assertSafeTestDatabase(process.env.TEST_DATABASE_URL as string, process.env);
      process.env.NODE_ENV = "test";
      ds = await connect();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
    }, 60_000);

    afterAll(async () => {
      process.env.NODE_ENV = savedNodeEnv;
      for (const pool of pools) if (pool.isInitialized) await pool.destroy();
    });

    beforeEach(async () => {
      await ds.query("TRUNCATE rate_limit_buckets");
    });

    it("keeps the count across a restart: a new instance on a new pool sees earlier hits", async () => {
      const credential = RATE_LIMIT_POLICIES.credential;
      const first = new PgRateLimitStore(ds);
      for (let i = 0; i < 3; i++) {
        expect((await first.hit("user:u1:credential", credential, T0)).allowed).toBe(true);
      }
      const restarted = new PgRateLimitStore(await connect());
      const blocked = await restarted.hit("user:u1:credential", credential, T0 + 1_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.exceeded).toEqual(credential[0]);
      expect(blocked.retryAfterSeconds).toBe(15 * 60 - 1);
    });

    it("shares one limit between two concurrent instances (replicas)", async () => {
      const a = new PgRateLimitStore(await connect());
      const b = new PgRateLimitStore(await connect());
      const window = [{ limit: 10, windowMs: MINUTE }];
      const results = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          (i % 2 ? a : b).hit("user:u2:destructive", window, T0),
        ),
      );
      expect(results.filter((r) => r.allowed)).toHaveLength(10);
      const [row] = await ds.query("SELECT count FROM rate_limit_buckets");
      expect(row.count).toBe(10);
    });

    it("shares a multi-window limit between instances without spending quota on refusals", async () => {
      const a = new PgRateLimitStore(await connect());
      const b = new PgRateLimitStore(await connect());
      const windows = [
        { limit: 3, windowMs: 15 * MINUTE },
        { limit: 10, windowMs: 24 * 60 * MINUTE },
      ];
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          (i % 2 ? a : b).hit("user:u3:credential", windows, T0),
        ),
      );
      expect(results.filter((r) => r.allowed)).toHaveLength(3);
      // The refused nine left the day window at 3, not 12.
      const rows: { key: string; count: number }[] = await ds.query(
        "SELECT key, count FROM rate_limit_buckets ORDER BY key",
      );
      expect(rows.map((r) => r.count)).toEqual([3, 3]);
      // After the short window passes, the day window still counts what was spent.
      for (let i = 0; i < 3; i++) {
        expect((await a.hit("user:u3:credential", windows, T0 + 16 * MINUTE)).allowed).toBe(true);
      }
    });

    it("rolls the window over in SQL: a full bucket opens again once its window has passed", async () => {
      const store = new PgRateLimitStore(ds);
      const window = [{ limit: 2, windowMs: MINUTE }];
      await store.hit("k", window, T0);
      await store.hit("k", window, T0);
      expect((await store.hit("k", window, T0 + MINUTE - 1)).allowed).toBe(false);
      const reopened = await store.hit("k", window, T0 + MINUTE);
      expect(reopened).toMatchObject({ allowed: true, remaining: 1 });
    });

    it("peek reads without counting, reset clears one window", async () => {
      const store = new PgRateLimitStore(ds);
      const window = { limit: 2, windowMs: MINUTE };
      expect((await store.peek("p", window, T0)).allowed).toBe(true);
      await store.hit("p", [window], T0);
      await store.hit("p", [window], T0);
      expect(await store.peek("p", window, T0 + 1_000)).toMatchObject({
        allowed: false,
        retryAfterSeconds: 59,
      });
      expect((await store.peek("p", { limit: 3, windowMs: MINUTE }, T0)).allowed).toBe(true);
      await store.reset("p", window);
      expect((await store.peek("p", window, T0)).allowed).toBe(true);
    });

    it("refund gives back one hit atomically and never goes below zero", async () => {
      const store = new PgRateLimitStore(ds);
      const window = { limit: 2, windowMs: MINUTE };
      await store.refund("r", window, T0); // no row: a no-op
      await store.hit("r", [window], T0);
      await store.hit("r", [window], T0);
      expect((await store.hit("r", [window], T0)).allowed).toBe(false);
      await Promise.all([1, 2, 3].map(() => store.refund("r", window, T0)));
      const [row] = await ds.query("SELECT count FROM rate_limit_buckets WHERE key = 'r|60000'");
      expect(row.count).toBe(0);
      expect((await store.hit("r", [window], T0)).allowed).toBe(true);
    });

    it("sweeps expired rows in the background every SWEEP_EVERY hits", async () => {
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      await ds.query(
        `INSERT INTO rate_limit_buckets (key, window_start, count, expires_at)
       VALUES ('old', now() - interval '2 hours', 1, now() - interval '1 hour')`,
      );
      const store = new PgRateLimitStore(ds);
      const sweep = vi.spyOn(store, "sweep");
      for (let i = 0; i < SWEEP_EVERY; i++)
        await store.hit(`fresh:${i % 5}`, [{ limit: 1e6, windowMs: MINUTE }]);
      expect(sweep).toHaveBeenCalledTimes(1);
      await sweep.mock.results[0]?.value;
      expect(await ds.query("SELECT key FROM rate_limit_buckets WHERE key = 'old'")).toEqual([]);
    }, 60_000);
  },
);
