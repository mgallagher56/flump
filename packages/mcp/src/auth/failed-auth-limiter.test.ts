import { describe, expect, it } from "vitest";
import { FailedAuthLimiter, normalizeIpKey } from "./failed-auth-limiter.js";

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

  it("clears the failure count after a successful authentication", () => {
    const l = new FailedAuthLimiter(3, 60_000);
    l.recordFailure("1.1.1.1", 0);
    l.recordFailure("1.1.1.1", 0);
    l.recordSuccess("1.1.1.1");
    l.recordFailure("1.1.1.1", 1);
    l.recordFailure("1.1.1.1", 1);
    expect(l.check("1.1.1.1", 2).blocked).toBe(false);
    expect(l.size).toBe(1);
  });

  it("keys IPv6 by /64 prefix", () => {
    const l = new FailedAuthLimiter(2, 60_000);
    l.recordFailure("2001:db8:1:2:aaaa::1", 0);
    l.recordFailure("2001:db8:1:2:bbbb::9", 0);
    expect(l.check("2001:db8:1:2:cccc::5", 1).blocked).toBe(true);
    expect(l.check("2001:db8:1:3::1", 1).blocked).toBe(false);
  });

  it("handles compressed and zone-suffixed IPv6", () => {
    expect(normalizeIpKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("2001:0db8:0000:0000:1:2:3:4")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("treats IPv4-mapped IPv6 as IPv4", () => {
    expect(normalizeIpKey("::ffff:1.2.3.4")).toBe("1.2.3.4");
    const l = new FailedAuthLimiter(1, 60_000);
    l.recordFailure("::ffff:5.6.7.8", 0);
    expect(l.check("5.6.7.8", 1).blocked).toBe(true);
  });

  it("leaves IPv4 and unknown values untouched", () => {
    expect(normalizeIpKey("1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIpKey("unknown")).toBe("unknown");
  });
});
