import { describe, expect, it, vi } from "vitest";
import type { LimitStore } from "./limit-store.js";
import { McpRateLimiter } from "./rate-limiter.js";

function failingStore(code?: string) {
  const hit = vi.fn(() =>
    Promise.reject(Object.assign(new Error("store down"), code ? { code } : {})),
  );
  const store: LimitStore = {
    hit,
    peek: () => Promise.reject(new Error("unused")),
    reset: () => Promise.reject(new Error("unused")),
    refund: () => Promise.reject(new Error("unused")),
  };
  return { store, hit };
}

describe("McpRateLimiter store failures", () => {
  it("fails open on a store error: allowed, logged as an error, and the store is tried again next time", async () => {
    const { store, hit } = failingStore();
    const logger = { warn: vi.fn(), error: vi.fn() };
    const limiter = new McpRateLimiter(2, 300, store, logger);
    const first = await limiter.checkLimit("k", 0);
    expect(first.allowed).toBe(true);
    // Fail-open answer: nothing is known about the window, so nothing is promised as left.
    expect(first.remaining).toBe(0);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    await limiter.checkLimit("k", 0);
    // A passing outage does not switch the limiter to memory for good.
    expect(hit).toHaveBeenCalledTimes(2);
  });

  it("on a missing table, warns once and stops asking the store", async () => {
    const { store, hit } = failingStore("42P01");
    const logger = { warn: vi.fn(), error: vi.fn() };
    const limiter = new McpRateLimiter(2, 300, store, logger);
    for (let i = 0; i < 3; i++) await limiter.checkLimit("k", 0);
    expect(hit).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("warns once even when two requests find the table missing at the same time", async () => {
    const { store } = failingStore("42P01");
    const logger = { warn: vi.fn(), error: vi.fn() };
    const limiter = new McpRateLimiter(2, 300, store, logger);
    await Promise.all([limiter.checkLimit("k", 0), limiter.checkLimit("k", 0)]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
