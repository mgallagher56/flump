import { describe, expect, it, vi } from "vitest";
import {
  FAIL_CLOSED_RETRY_SECONDS,
  FailedAuthLimiter,
  normalizeIpKey,
} from "./failed-auth-limiter.js";
import { type LimitStore, MemoryLimitStore } from "./limit-store.js";

describe("FailedAuthLimiter", () => {
  it("blocks an IP after the maximum failures in the window, with Retry-After", async () => {
    const l = new FailedAuthLimiter(10, 60_000);
    const t = 1_000;
    for (let i = 0; i < 10; i++) {
      expect((await l.check("1.1.1.1", t)).blocked).toBe(false);
      await l.recordFailure("1.1.1.1", t);
    }
    const r = await l.check("1.1.1.1", t + 1_000);
    expect(r.blocked).toBe(true);
    expect(r.retryAfterSeconds).toBe(59);
    expect((await l.check("2.2.2.2", t)).blocked).toBe(false);
  });

  it("unblocks once the window has passed", async () => {
    const l = new FailedAuthLimiter(2, 60_000);
    await l.recordFailure("a", 0);
    await l.recordFailure("a", 0);
    expect((await l.check("a", 59_999)).blocked).toBe(true);
    expect((await l.check("a", 60_000)).blocked).toBe(false);
  });

  it("keeps the default store bounded", async () => {
    const store = new MemoryLimitStore(100);
    const l = new FailedAuthLimiter(10, 60_000, store);
    for (let i = 0; i < 1_000; i++) await l.recordFailure(`ip-${i}`, i);
    expect(store.size).toBeLessThanOrEqual(100);
  });

  it("clears the failure count after a successful authentication", async () => {
    const l = new FailedAuthLimiter(3, 60_000);
    await l.recordFailure("1.1.1.1", 0);
    await l.recordFailure("1.1.1.1", 0);
    await l.recordSuccess("1.1.1.1", 0);
    await l.recordFailure("1.1.1.1", 1);
    await l.recordFailure("1.1.1.1", 1);
    expect((await l.check("1.1.1.1", 2)).blocked).toBe(false);
  });

  it("clears failures at most once per window so a valid token cannot reset the limit forever", async () => {
    const l = new FailedAuthLimiter(3, 60_000);
    for (let round = 0; round < 5; round++) {
      await l.recordFailure("1.1.1.1", round);
      await l.recordFailure("1.1.1.1", round);
      await l.recordSuccess("1.1.1.1", round);
    }
    await l.recordFailure("1.1.1.1", 10);
    await l.recordFailure("1.1.1.1", 10);
    await l.recordFailure("1.1.1.1", 10);
    expect((await l.check("1.1.1.1", 11)).blocked).toBe(true);
  });

  it("keys IPv6 by /64 prefix", async () => {
    const l = new FailedAuthLimiter(2, 60_000);
    await l.recordFailure("2001:db8:1:2:aaaa::1", 0);
    await l.recordFailure("2001:db8:1:2:bbbb::9", 0);
    expect((await l.check("2001:db8:1:2:cccc::5", 1)).blocked).toBe(true);
    expect((await l.check("2001:db8:1:3::1", 1)).blocked).toBe(false);
  });

  it("handles compressed and zone-suffixed IPv6", async () => {
    expect(normalizeIpKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("2001:0db8:0000:0000:1:2:3:4")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("treats IPv4-mapped IPv6 as IPv4", async () => {
    expect(normalizeIpKey("::ffff:1.2.3.4")).toBe("1.2.3.4");
    const l = new FailedAuthLimiter(1, 60_000);
    await l.recordFailure("::ffff:5.6.7.8", 0);
    expect((await l.check("5.6.7.8", 1)).blocked).toBe(true);
  });

  it("leaves IPv4 and unknown values untouched", async () => {
    expect(normalizeIpKey("1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIpKey("unknown")).toBe("unknown");
  });

  it("keeps its counters in the injected store, so a second limiter on it sees them", async () => {
    const store = new MemoryLimitStore();
    await new FailedAuthLimiter(2, 60_000, store).recordFailure("9.9.9.9", 0);
    await new FailedAuthLimiter(2, 60_000, store).recordFailure("9.9.9.9", 0);
    expect((await new FailedAuthLimiter(2, 60_000, store).check("9.9.9.9", 1)).blocked).toBe(true);
  });

  it("fails closed when the store cannot be read, and never throws on writes", async () => {
    const broken: LimitStore = {
      hit: () => Promise.reject(new Error("db down")),
      peek: () => Promise.reject(new Error("db down")),
      reset: () => Promise.reject(new Error("db down")),
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const l = new FailedAuthLimiter(10, 60_000, broken);
    expect(await l.check("1.1.1.1")).toEqual({
      blocked: true,
      retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS,
    });
    await expect(l.recordFailure("1.1.1.1")).resolves.toBeUndefined();
    await expect(l.recordSuccess("1.1.1.1")).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
