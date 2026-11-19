import { describe, expect, it } from "vitest";
import { isMissingTableError, type LimitWindow, MemoryLimitStore } from "./limit-store.js";

const MINUTE: LimitWindow = { limit: 1, windowMs: 60_000 };
const HOUR: LimitWindow = { limit: 1, windowMs: 3_600_000 };

describe("isMissingTableError", () => {
  it("is true for Postgres undefined_table (42P01), raw or wrapped as a driver error", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    // TypeORM's QueryFailedError carries the Postgres code on `driverError`.
    expect(isMissingTableError({ driverError: { code: "42P01" } })).toBe(true);
  });

  it("is false for other codes and for values that are not objects, without throwing", () => {
    expect(isMissingTableError({ code: "23505" })).toBe(false);
    expect(isMissingTableError({ driverError: { code: "57014" } })).toBe(false);
    for (const value of [null, undefined, "42P01", 42, true]) {
      expect(isMissingTableError(value)).toBe(false);
    }
  });
});

describe("MemoryLimitStore.hit", () => {
  it("reports the longest wait when several windows are full, whichever order they come in", async () => {
    // Both windows (limit 1) are filled at t = 0. A second hit at t = 0 is refused by both:
    // the minute frees up at 60 s, the hour at 3,600 s. The hit is only allowed once every
    // window has room, so the wait is the longer one: 3,600 s, and the hour is named.
    for (const windows of [
      [MINUTE, HOUR],
      [HOUR, MINUTE],
    ]) {
      const store = new MemoryLimitStore();
      await store.hit("k", windows, 0);
      const refused = await store.hit("k", windows, 0);
      expect(refused).toEqual({
        allowed: false,
        retryAfterSeconds: 3_600,
        exceeded: HOUR,
        remaining: 0,
      });
    }
  });

  it("does not move a key that is hit again to the back of the eviction queue", async () => {
    // Cap 2. Insertion order a, b. A second hit on `a` updates it in place, so `a` stays the
    // oldest insertion and is the one dropped when `c` arrives; `b` keeps its count.
    const w: LimitWindow = { limit: 5, windowMs: 60_000 };
    const one: LimitWindow = { limit: 1, windowMs: 60_000 };
    const store = new MemoryLimitStore(2);
    await store.hit("a", [w], 0);
    await store.hit("b", [w], 0);
    await store.hit("a", [w], 0);
    await store.hit("c", [w], 0);
    // `one` reads the same bucket as `w` (same key and window length): full once count >= 1.
    expect((await store.peek("b", one, 0)).allowed).toBe(false);
    expect((await store.peek("a", one, 0)).allowed).toBe(true);
  });

  it("never holds more buckets than its cap", async () => {
    const store = new MemoryLimitStore(2);
    for (const key of ["a", "b", "c", "d"]) {
      await store.hit(key, [MINUTE], 0);
      expect(store.size).toBeLessThanOrEqual(2);
    }
  });

  it("drops expired buckets before live ones once at the cap", async () => {
    // Cap 2. `a` lives for 60 s, `b` for 1 s, both from t = 0. At t = 1,000 `b` has just expired
    // (its window ends at 1,000), so adding `c` drops `b`, not the older but live `a`.
    const long: LimitWindow = { limit: 5, windowMs: 60_000 };
    const short: LimitWindow = { limit: 5, windowMs: 1_000 };
    const store = new MemoryLimitStore(2);
    await store.hit("a", [long], 0);
    await store.hit("b", [short], 0);
    await store.hit("c", [short], 1_000);
    expect(store.size).toBe(2);
    expect((await store.peek("a", { limit: 1, windowMs: 60_000 }, 1_000)).allowed).toBe(false);
  });
});

describe("MemoryLimitStore.peek", () => {
  const w: LimitWindow = { limit: 2, windowMs: 60_000 };

  it("allows a key it has never seen, and one whose window still has room", async () => {
    const store = new MemoryLimitStore();
    expect(await store.peek("k", w, 0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    await store.hit("k", [w], 0);
    // 1 of 2 used: room left.
    expect(await store.peek("k", w, 10)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("refuses a full window without counting, with the seconds until it resets", async () => {
    const store = new MemoryLimitStore();
    await store.hit("k", [w], 0);
    await store.hit("k", [w], 0);
    // The window opened at 0 and resets at 60,000. At 15,500 there are 44,500 ms left,
    // which rounds up to 45 whole seconds.
    expect(await store.peek("k", w, 15_500)).toEqual({
      allowed: false,
      retryAfterSeconds: 45,
      exceeded: w,
      remaining: 0,
    });
    // Peeking twice spends nothing: still the same answer.
    expect((await store.peek("k", w, 15_500)).retryAfterSeconds).toBe(45);
  });

  it("allows again from the instant the window resets", async () => {
    const store = new MemoryLimitStore();
    await store.hit("k", [w], 0);
    await store.hit("k", [w], 0);
    expect((await store.peek("k", w, 59_999)).allowed).toBe(false);
    expect((await store.peek("k", w, 60_000)).allowed).toBe(true);
  });
});

describe("MemoryLimitStore.refund", () => {
  it("is a no-op for a key it has never seen", async () => {
    await expect(new MemoryLimitStore().refund("nope", MINUTE, 0)).resolves.toBeUndefined();
  });

  it("never takes a counter below zero", async () => {
    // Limit 1: hit (count 1), refund (0), refund again (stays 0). One hit then fits and the
    // next is refused. A counter allowed to reach -1 would let two more hits through.
    const store = new MemoryLimitStore();
    await store.hit("k", [MINUTE], 0);
    await store.refund("k", MINUTE, 0);
    await store.refund("k", MINUTE, 0);
    expect((await store.hit("k", [MINUTE], 0)).allowed).toBe(true);
    expect((await store.hit("k", [MINUTE], 0)).allowed).toBe(false);
  });
});
