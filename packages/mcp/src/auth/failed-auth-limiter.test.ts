import { describe, expect, it } from "vitest";
import { FailedAuthLimiter } from "./failed-auth-limiter.js";

describe("FailedAuthLimiter", () => {
  it("blocks an IP after the maximum failures in the window, with Retry-After", () => {
    const l = new FailedAuthLimiter(10, 60_000);
    const t = 1_000;
    for (let i = 0; i < 10; i++) {
      expect(l.check("1.1.1.1", t).blocked).toBe(false);
      l.recordFailure("1.1.1.1", t);
    }
    const r = l.check("1.1.1.1", t + 1_000);
    expect(r.blocked).toBe(true);
    expect(r.retryAfterSeconds).toBe(59);
    expect(l.check("2.2.2.2", t).blocked).toBe(false);
  });

  it("unblocks once the window has passed", () => {
    const l = new FailedAuthLimiter(2, 60_000);
    l.recordFailure("a", 0);
    l.recordFailure("a", 0);
    expect(l.check("a", 59_999).blocked).toBe(true);
    expect(l.check("a", 60_000).blocked).toBe(false);
  });

  it("keeps the map bounded", () => {
    const l = new FailedAuthLimiter(10, 60_000, 100);
    for (let i = 0; i < 1_000; i++) l.recordFailure(`ip-${i}`, i);
    expect(l.size).toBeLessThanOrEqual(100);
  });
});
