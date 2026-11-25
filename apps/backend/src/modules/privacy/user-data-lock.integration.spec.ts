import "reflect-metadata";
import { DataSource, type DataSourceOptions, type EntityManager } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { lockUserData, lockUserDataShared, USER_DATA_LOCK_WAIT_MS } from "./user-data-lock";

// How long lockUserData waits (the erasure's step (b) and the reset), on real Postgres. The pool
// here has much shorter limits than production (lock 200 ms, statement 400 ms) so the tests stay
// quick: a wait that outlives both proves lockUserData sets its own limits rather than using the
// pool's. Needs no schema: advisory locks only.
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_lock_test \
//     bunx vitest run src/modules/privacy/user-data-lock.integration.spec.ts
const POOL_LOCK_MS = 200;
const POOL_STATEMENT_MS = 400;
// Made-up id, built at runtime.
const USER = ["lock", "person"].join("-");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "lockUserData wait (real Postgres)",
  () => {
    let ds: DataSource;

    beforeAll(async () => {
      const url = process.env.TEST_DATABASE_URL as string;
      assertSafeTestDatabase(url, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: url,
        DB_LOCK_TIMEOUT_MS: String(POOL_LOCK_MS),
        DB_STATEMENT_TIMEOUT_MS: String(POOL_STATEMENT_MS),
      });
      ds = new DataSource({
        ...(options as DataSourceOptions),
        entities: [],
        migrations: [],
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
    });

    afterAll(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    /** Holds the shared lock (a fenced write of USER in flight) until the returned release runs. */
    const holdShared = async () => {
      let release!: () => void;
      const released = new Promise<void>((r) => {
        release = r;
      });
      let held!: () => void;
      const holding = new Promise<void>((r) => {
        held = r;
      });
      const done = ds.transaction(async (m) => {
        await lockUserDataShared(m, USER);
        held();
        await released;
      });
      await holding;
      return { release, done };
    };

    const settings = async (m: EntityManager) =>
      (
        (await m.query(
          `SELECT current_setting('lock_timeout') AS "lock", current_setting('statement_timeout') AS "statement"`,
        )) as Array<{ lock: string; statement: string }>
      )[0];

    it("waits past the pool's lock and statement limits for a write in flight, then restores them", async () => {
      expect(USER_DATA_LOCK_WAIT_MS).toBe(30_000);
      const writer = await holdShared();
      // Released after 600 ms: longer than the pool's 200 ms lock limit and 400 ms statement limit,
      // so with the pool's limits the lock statement would fail.
      const timer = setTimeout(writer.release, 3 * POOL_LOCK_MS);
      const started = Date.now();
      const after = await ds.transaction(async (m) => {
        await lockUserData(m, USER);
        return settings(m);
      });
      clearTimeout(timer);
      await writer.done;
      expect(Date.now() - started).toBeGreaterThanOrEqual(3 * POOL_LOCK_MS - 50);
      // The rest of the erasure's transaction runs under the pool's limits again.
      expect(after).toEqual({ lock: `${POOL_LOCK_MS}ms`, statement: `${POOL_STATEMENT_MS}ms` });
    });

    it("gives up with lock_not_available when the wait runs out, and the connection keeps its limits", async () => {
      const writer = await holdShared();
      try {
        // A 100 ms wait through the test seam; the real 30 s takes the same path.
        const failed = ds.transaction((m) => lockUserData(m, USER, 100));
        await expect(failed).rejects.toMatchObject({ driverError: { code: "55P03" } });
      } finally {
        writer.release();
        await writer.done;
      }
      // set_config(..., true) is transaction-local: no pooled connection keeps the longer limits.
      const runner = ds.createQueryRunner();
      try {
        for (let i = 0; i < 3; i++) {
          expect(await settings(runner.manager)).toEqual({
            lock: `${POOL_LOCK_MS}ms`,
            statement: `${POOL_STATEMENT_MS}ms`,
          });
        }
      } finally {
        await runner.release();
      }
    });
  },
);
