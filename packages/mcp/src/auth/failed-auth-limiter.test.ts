import { describe, expect, it, vi } from "vitest";
import {
  FAIL_CLOSED_RETRY_SECONDS,
  FailedAuthLimiter,
  normalizeIpKey,
} from "./failed-auth-limiter.js";
import { type LimitStore, MemoryLimitStore } from "./limit-store.js";

const broken = (code?: string): LimitStore => {
  const fail = () => Promise.reject(Object.assign(new Error("db down"), code ? { code } : {}));
  return { hit: fail, peek: fail, reset: fail, refund: fail };
};

describe("FailedAuthLimiter", () => {
  it("blocks an IP once the window holds the maximum attempts, with Retry-After", async () => {
    const l = new FailedAuthLimiter(10, 60_000);
    const t = 1_000;
    for (let i = 0; i < 10; i++) expect((await l.attempt("1.1.1.1", t)).blocked).toBe(false);
    const r = await l.attempt("1.1.1.1", t + 1_000);
    expect(r.blocked).toBe(true);
    expect(r.retryAfterSeconds).toBe(59);
    expect((await l.attempt("2.2.2.2", t)).blocked).toBe(false);
  });

  it("counts concurrent attempts atomically: never more than the maximum get through", async () => {
    const l = new FailedAuthLimiter(5, 60_000);
    const results = await Promise.all(Array.from({ length: 50 }, () => l.attempt("3.3.3.3", 0)));
    expect(results.filter((r) => !r.blocked)).toHaveLength(5);
  });

  it("unblocks once the window has passed", async () => {
    const l = new FailedAuthLimiter(2, 60_000);
    await l.attempt("a", 0);
    await l.attempt("a", 0);
    expect((await l.attempt("a", 59_999)).blocked).toBe(true);
    expect((await l.attempt("a", 60_000)).blocked).toBe(false);
  });

  it("keeps the default store bounded", async () => {
    const store = new MemoryLimitStore(100);
    const l = new FailedAuthLimiter(10, 60_000, store);
    for (let i = 0; i < 1_000; i++) await l.attempt(`ip-${i}`, i);
    expect(store.size).toBeLessThanOrEqual(100);
  });

  it("gives a successful attempt back, so valid traffic never fills the window", async () => {
    const l = new FailedAuthLimiter(2, 60_000);
    for (let i = 0; i < 10; i++) {
      expect((await l.attempt("4.4.4.4", i)).blocked).toBe(false);
      await l.recordSuccess("4.4.4.4", i);
    }
  });

  it("clears earlier failures after a successful authentication", async () => {
    const l = new FailedAuthLimiter(3, 60_000);
    await l.attempt("1.1.1.1", 0);
    await l.attempt("1.1.1.1", 0);
    await l.attempt("1.1.1.1", 0); // the valid one
    await l.recordSuccess("1.1.1.1", 0);
    await l.attempt("1.1.1.1", 1);
    await l.attempt("1.1.1.1", 1);
    expect((await l.attempt("1.1.1.1", 2)).blocked).toBe(false);
  });

  it("clears failures at most once per window so a valid token cannot reset the limit forever", async () => {
    const l = new FailedAuthLimiter(3, 60_000);
    for (let round = 0; round < 5; round++) {
      await l.attempt("1.1.1.1", round);
      await l.attempt("1.1.1.1", round);
      if (!(await l.attempt("1.1.1.1", round)).blocked) await l.recordSuccess("1.1.1.1", round);
    }
    expect((await l.attempt("1.1.1.1", 11)).blocked).toBe(true);
  });

  it("forgive gives back one attempt and never goes below zero", async () => {
    const l = new FailedAuthLimiter(1, 60_000);
    await l.forgive("5.5.5.5", 0);
    await l.attempt("5.5.5.5", 0);
    await l.forgive("5.5.5.5", 0);
    expect((await l.attempt("5.5.5.5", 0)).blocked).toBe(false);
    expect((await l.attempt("5.5.5.5", 0)).blocked).toBe(true);
  });

  it("keys IPv6 by /64 prefix", async () => {
    const l = new FailedAuthLimiter(2, 60_000);
    await l.attempt("2001:db8:1:2:aaaa::1", 0);
    await l.attempt("2001:db8:1:2:bbbb::9", 0);
    expect((await l.attempt("2001:db8:1:2:cccc::5", 1)).blocked).toBe(true);
    expect((await l.attempt("2001:db8:1:3::1", 1)).blocked).toBe(false);
  });

  it("handles compressed and zone-suffixed IPv6", () => {
    expect(normalizeIpKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("2001:0db8:0000:0000:1:2:3:4")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("treats IPv4-mapped IPv6 as IPv4", async () => {
    expect(normalizeIpKey("::ffff:1.2.3.4")).toBe("1.2.3.4");
    const l = new FailedAuthLimiter(1, 60_000);
    await l.attempt("::ffff:5.6.7.8", 0);
    expect((await l.attempt("5.6.7.8", 1)).blocked).toBe(true);
  });

  it("leaves IPv4 and unknown values untouched", () => {
    expect(normalizeIpKey("1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIpKey("unknown")).toBe("unknown");
  });

  it("keeps its counters in the injected store, so a second limiter on it sees them", async () => {
    const store = new MemoryLimitStore();
    await new FailedAuthLimiter(2, 60_000, store).attempt("9.9.9.9", 0);
    await new FailedAuthLimiter(2, 60_000, store).attempt("9.9.9.9", 0);
    expect((await new FailedAuthLimiter(2, 60_000, store).attempt("9.9.9.9", 1)).blocked).toBe(
      true,
    );
  });

  it("uses the store's own clock unless a time is given (no Date.now from the limiter)", async () => {
    const hit = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const store: LimitStore = { ...new MemoryLimitStore(), hit } as unknown as LimitStore;
    await new FailedAuthLimiter(2, 60_000, store).attempt("1.1.1.1");
    expect(hit).toHaveBeenCalledWith(
      "mcpauth:fail:1.1.1.1",
      [{ limit: 2, windowMs: 60_000 }],
      undefined,
    );
  });

  it("fails closed when the store errors, and never throws on refunds", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const l = new FailedAuthLimiter(10, 60_000, broken());
    expect(await l.attempt("1.1.1.1")).toEqual({
      blocked: true,
      retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS,
    });
    await expect(l.forgive("1.1.1.1")).resolves.toBeUndefined();
    await expect(l.recordSuccess("1.1.1.1")).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("logs store failures through an injected logger, not the console (L6)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = { warn: vi.fn(), error: vi.fn() };
    await new FailedAuthLimiter(10, 60_000, broken(), logger).attempt("1.1.1.1");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(logger.error).toHaveBeenCalledWith("MCP failed-auth store failed, refusing: Error");
  });

  it("falls back to memory when the store's table is missing (42P01)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const l = new FailedAuthLimiter(2, 60_000, broken("42P01"));
    expect((await l.attempt("1.1.1.1", 0)).blocked).toBe(false);
    expect((await l.attempt("1.1.1.1", 0)).blocked).toBe(false);
    expect((await l.attempt("1.1.1.1", 0)).blocked).toBe(true);
    spy.mockRestore();
  });
});
