import { describe, expect, it } from "vitest";
import { RateLimitStore } from "./rate-limit.store";

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

  it("drops expired buckets so memory stays bounded", () => {
    const store = new RateLimitStore();
    const windows = [{ limit: 1, windowMs: MIN }];
    for (let i = 0; i < 50; i++) store.hit(`k${i}`, windows, 0);
    expect(store.size()).toBe(50);
    store.sweep(MIN + 1);
    expect(store.size()).toBe(0);
  });
});
