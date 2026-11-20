import { describe, expect, it } from "vitest";
import { MemorySharedRateLimitStore, RateLimitStore } from "./rate-limit.store";

const MIN = 60_000;

describe("RateLimitStore", () => {
  it("allows up to the limit then blocks with a retry delay", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 2, windowMs: MIN }];
    expect(store.hit("k", windows, 0).allowed).toBe(true);
    expect(store.hit("k", windows, 1000).allowed).toBe(true);
    const blocked = store.hit("k", windows, 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
  });

  it("resets after the window expires", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 1, windowMs: MIN }];
    store.hit("k", windows, 0);
    expect(store.hit("k", windows, MIN - 1).allowed).toBe(false);
    expect(store.hit("k", windows, MIN).allowed).toBe(true);
  });

  it("keeps keys independent", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 1, windowMs: MIN }];
    store.hit("a", windows, 0);
    expect(store.hit("b", windows, 0).allowed).toBe(true);
  });

  it("enforces every window and reports the longest wait when several are exhausted", () => {
    const store = new RateLimitStore();
    const windows = [
      { limit: 3, windowMs: 15 * MIN },
      { limit: 4, windowMs: 24 * 60 * MIN },
    ];
    for (let i = 0; i < 3; i++) store.hit("k", windows, 0);
    expect(store.hit("k", windows, 1).allowed).toBe(false);
    // After the short window resets, the fourth is allowed, the fifth hits the daily cap.
    expect(store.hit("k", windows, 15 * MIN).allowed).toBe(true);
    const daily = store.hit("k", windows, 15 * MIN + 1);
    expect(daily.allowed).toBe(false);
    expect(daily.retryAfterSeconds).toBeGreaterThan(15 * 60);
  });

  it("does not count a blocked attempt against other windows", () => {
    const store = new RateLimitStore();
    const windows = [
      { limit: 1, windowMs: MIN },
      { limit: 2, windowMs: 60 * MIN },
    ];
    store.hit("k", windows, 0);
    store.hit("k", windows, 1); // blocked by the minute window
    expect(store.hit("k", windows, MIN).allowed).toBe(true); // second hourly slot still free
  });

  it("never grows past the cap, evicting the oldest buckets first", () => {
    const store = new RateLimitStore(3);
    const windows = [{ limit: 1, windowMs: MIN }];
    for (let i = 0; i < 10; i++) store.hit(`k${i}`, windows, i);
    expect(store.size()).toBe(3);
    // k9 is still counted; k0 was evicted.
    expect(store.hit("k9", windows, 20).allowed).toBe(false);
    expect(store.hit("k0", windows, 20).allowed).toBe(true);
  });

  it("reports the longest wait when every window is full, whatever their order", () => {
    const store = new RateLimitStore();
    const windows = [
      { limit: 1, windowMs: MIN },
      { limit: 1, windowMs: 60 * MIN },
    ];
    store.hit("k", windows, 0);
    const blocked = store.hit("k", windows, 1000);
    // Minute window waits 60 - 1 = 59 s; the hour window waits 3600 - 1 = 3599 s. The longer wins.
    expect(blocked).toEqual({
      allowed: false,
      retryAfterSeconds: 3599,
      exceeded: { limit: 1, windowMs: 60 * MIN },
      remaining: 0,
    });
  });

  it("says how many hits are left in the tightest window", () => {
    const store = new RateLimitStore();
    const windows = [
      { limit: 3, windowMs: MIN },
      { limit: 5, windowMs: 60 * MIN },
    ];
    // First hit: 3 - 1 = 2 left in the minute window, 5 - 1 = 4 in the hour; the tightest is 2.
    expect(store.hit("k", windows, 0)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 2,
    });
    // Second hit: 1 left in the minute window.
    expect(store.hit("k", windows, 1).remaining).toBe(1);
  });

  it("keeps other buckets when a key already counted is hit again at the cap", () => {
    const store = new RateLimitStore(3);
    const windows = [{ limit: 2, windowMs: MIN }];
    for (const key of ["a", "b", "c"]) store.hit(key, windows, 0);
    store.hit("c", windows, 1); // c is already stored, so nothing needs evicting
    expect(store.size()).toBe(3);
    // a still holds its first hit: one more is allowed (2 of 2), the next is refused.
    expect(store.hit("a", windows, 2).allowed).toBe(true);
    expect(store.hit("a", windows, 3).allowed).toBe(false);
  });

  it("at the cap drops expired buckets before evicting live ones", () => {
    const store = new RateLimitStore(3);
    store.hit("long", [{ limit: 1, windowMs: 10 * MIN }], 0);
    store.hit("short1", [{ limit: 1, windowMs: MIN }], 0);
    store.hit("short2", [{ limit: 1, windowMs: MIN }], 0);
    // At MIN + 1 both short buckets have expired, so the new bucket takes their room
    // and the long bucket (live until 10 min) keeps its count.
    store.hit("new", [{ limit: 1, windowMs: MIN }], MIN + 1);
    expect(store.hit("long", [{ limit: 1, windowMs: 10 * MIN }], MIN + 2).allowed).toBe(false);
  });

  it("sweeps expired buckets on its own every 500 hits", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 1000, windowMs: MIN }];
    for (let i = 0; i < 50; i++) store.hit(`k${i}`, windows, 0);
    // Hits 51 to 500 land after the first 50 buckets expired at MIN; the 500th hit sweeps them,
    // leaving only the live bucket "x".
    for (let i = 0; i < 450; i++) store.hit("x", windows, MIN + 1);
    expect(store.size()).toBe(1);
  });

  it("drops a bucket at the very moment its window ends", () => {
    const store = new RateLimitStore();
    store.hit("k", [{ limit: 1, windowMs: MIN }], 0);
    // The window is [0, MIN): at MIN it has ended.
    store.sweep(MIN);
    expect(store.size()).toBe(0);
  });

  it("drops expired buckets so memory stays bounded", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 1, windowMs: MIN }];
    for (let i = 0; i < 50; i++) store.hit(`k${i}`, windows, 0);
    expect(store.size()).toBe(50);
    store.sweep(MIN + 1);
    expect(store.size()).toBe(0);
  });
});

describe("RateLimitStore.peek", () => {
  const window = { limit: 2, windowMs: MIN };

  it("allows a key with no bucket or with room left, without counting", () => {
    const store = new RateLimitStore();
    expect(store.peek("k", window, 0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    store.hit("k", [window], 0);
    // One hit of two: still room.
    expect(store.peek("k", window, 1)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    // Peeking did not count: the second hit is still allowed.
    expect(store.hit("k", [window], 2).allowed).toBe(true);
  });

  it("refuses a full window with the wait until it ends", () => {
    const store = new RateLimitStore();
    store.hit("k", [window], 0);
    store.hit("k", [window], 0);
    // The window ends at 60 000 ms; at 1 500 ms that is 58.5 s, rounded up to 59.
    expect(store.peek("k", window, 1500)).toEqual({
      allowed: false,
      retryAfterSeconds: 59,
      exceeded: window,
      remaining: 0,
    });
  });

  it("allows again at the moment the window ends", () => {
    const store = new RateLimitStore();
    store.hit("k", [window], 0);
    store.hit("k", [window], 0);
    expect(store.peek("k", window, MIN).allowed).toBe(true);
  });
});

describe("RateLimitStore.reset and refund", () => {
  const window = { limit: 1, windowMs: MIN };

  it("reset drops the window's counter", () => {
    const store = new RateLimitStore();
    store.hit("k", [window], 0);
    store.reset("k", window);
    expect(store.hit("k", [window], 1).allowed).toBe(true);
  });

  it("refund gives back one hit in the current window", () => {
    const store = new RateLimitStore();
    store.hit("k", [window], 0);
    store.refund("k", window, 1);
    expect(store.hit("k", [window], 2).allowed).toBe(true);
    expect(store.hit("k", [window], 3).allowed).toBe(false);
  });

  it("refund never goes below zero", () => {
    const store = new RateLimitStore();
    store.hit("k", [window], 0);
    store.refund("k", window, 1);
    store.refund("k", window, 2); // already at zero: no change
    // Limit 1: one hit allowed, the next refused. A count of -1 would allow two.
    expect(store.hit("k", [window], 3).allowed).toBe(true);
    expect(store.hit("k", [window], 4).allowed).toBe(false);
  });

  it("refund of a key never hit does nothing", () => {
    const store = new RateLimitStore();
    expect(() => store.refund("none", window, 0)).not.toThrow();
    expect(store.size()).toBe(0);
  });
});

describe("MemorySharedRateLimitStore", () => {
  const window = { limit: 1, windowMs: MIN };

  it("peeks, resets and refunds through the shared interface", async () => {
    const store = new MemorySharedRateLimitStore();
    await store.hit("k", [window], 0);
    expect(await store.peek("k", window, 1000)).toEqual({
      allowed: false,
      retryAfterSeconds: 59, // 60 s window, 1 s in
      exceeded: window,
      remaining: 0,
    });
    await store.reset("k", window);
    expect((await store.peek("k", window, 1000)).allowed).toBe(true);
    await store.hit("k", [window], 1000);
    await store.refund("k", window, 1001);
    expect((await store.hit("k", [window], 1002)).allowed).toBe(true);
  });
});
