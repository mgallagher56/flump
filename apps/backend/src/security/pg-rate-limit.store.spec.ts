import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { PgRateLimitStore } from "./pg-rate-limit.store";

// Unit tests with a fake DataSource: the SQL itself is covered by
// pg-rate-limit.store.integration.spec.ts against a real Postgres.

const MIN = 60_000;
const T0 = 1_794_632_012_000;

type Row = { count: number | null; retry: number | null };

/** A fake DataSource whose hit statement answers from `answer(params)`. */
function fakeDataSource(answer: (params: unknown[]) => Row[] | Promise<Row[]>) {
  const calls: unknown[][] = [];
  const runner = {
    isTransactionActive: false,
    connect: vi.fn(async () => undefined),
    startTransaction: vi.fn(async () => {
      runner.isTransactionActive = true;
    }),
    commitTransaction: vi.fn(async () => {
      runner.isTransactionActive = false;
    }),
    rollbackTransaction: vi.fn(async () => {
      runner.isTransactionActive = false;
    }),
    release: vi.fn(async () => undefined),
    query: vi.fn(async (_sql: string, params: unknown[]) => {
      calls.push(params);
      return answer(params);
    }),
  };
  const dataSource = {
    query: vi.fn(async (_sql: string, params: unknown[]) => {
      calls.push(params);
      return answer(params);
    }),
    createQueryRunner: () => runner,
  };
  return { dataSource: dataSource as unknown as DataSource, runner, calls };
}

describe("PgRateLimitStore (unit)", () => {
  it("allows a hit with no windows without touching the database", async () => {
    const { dataSource, calls } = fakeDataSource(() => []);
    const store = new PgRateLimitStore(dataSource);
    expect(await store.hit("k", [])).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(calls).toHaveLength(0);
  });

  it("stores only a keyed hash of the key and window, and passes the caller's clock (N4)", async () => {
    const { dataSource, calls } = fakeDataSource(() => [{ count: 1, retry: 60 }]);
    const store = new PgRateLimitStore(dataSource);
    await store.hit("mcp:fail:203.0.113.7", [{ limit: 5, windowMs: MIN }], T0);
    await store.hit("mcp:fail:203.0.113.7", [{ limit: 5, windowMs: 60 * MIN }]);
    const [first, second] = calls as [unknown[], unknown[]];
    // The stored key is rl1: plus 32 hex characters, never the address.
    expect(first[0]).toMatch(/^rl1:[0-9a-f]{32}$/);
    expect(String(first[0])).not.toContain("203.0.113.7");
    // Another window length is another bucket.
    expect(second[0]).toMatch(/^rl1:[0-9a-f]{32}$/);
    expect(second[0]).not.toBe(first[0]);
    // A given clock reaches the statement as that instant; none means the database clock (null).
    expect(first[1]).toEqual(new Date(T0));
    expect(second[1]).toBeNull();
  });

  it("refuses when the statement returns no row, never lets it through", async () => {
    const { dataSource } = fakeDataSource(() => []);
    const store = new PgRateLimitStore(dataSource);
    const decision = await store.hit("k", [{ limit: 5, windowMs: MIN }], T0);
    // No row is read as a refusal with the shortest wait, 1 second.
    expect(decision).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
      exceeded: { limit: 5, windowMs: MIN },
      remaining: 0,
    });
  });

  it("reports the longest wait when several windows refuse, and rolls back", async () => {
    const short = { limit: 3, windowMs: 15 * MIN };
    const long = { limit: 10, windowMs: 24 * 60 * MIN };
    // Both full: the 15 minute window waits 30 s, the day window 3 600 s.
    const { dataSource, runner } = fakeDataSource((params) =>
      params[2] === short.windowMs ? [{ count: null, retry: 30 }] : [{ count: null, retry: 3600 }],
    );
    const store = new PgRateLimitStore(dataSource);
    const decision = await store.hit("user:u:credential", [long, short], T0);
    expect(decision).toEqual({
      allowed: false,
      retryAfterSeconds: 3600,
      exceeded: long,
      remaining: 0,
    });
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });

  it("rolls back and passes the error on when a statement fails mid-transaction", async () => {
    const failure = new Error("db down");
    const { dataSource, runner } = fakeDataSource(() => Promise.reject(failure));
    const store = new PgRateLimitStore(dataSource);
    const windows = [
      { limit: 3, windowMs: 15 * MIN },
      { limit: 10, windowMs: 24 * 60 * MIN },
    ];
    await expect(store.hit("k", windows, T0)).rejects.toBe(failure);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("does not roll back a transaction that never started, and still passes the error on", async () => {
    const failure = new Error("cannot begin");
    const { dataSource, runner } = fakeDataSource(() => []);
    runner.startTransaction.mockRejectedValueOnce(failure);
    const store = new PgRateLimitStore(dataSource);
    const windows = [
      { limit: 3, windowMs: 15 * MIN },
      { limit: 10, windowMs: 24 * 60 * MIN },
    ];
    await expect(store.hit("k", windows, T0)).rejects.toBe(failure);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
  });
});
