import { describe, expect, it } from "vitest";
import { clientKey } from "./client-key";

describe("clientKey", () => {
  it("keeps IPv4 as is and unwraps IPv4-mapped IPv6", () => {
    expect(clientKey("203.0.113.9")).toBe("203.0.113.9");
    expect(clientKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
  });

  it("keys IPv6 by /64", () => {
    const a = clientKey("2001:db8:abcd:12::1");
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(clientKey("2001:db8:abcd:12:ffff:ffff:ffff:ffff")).toBe(a);
    expect(clientKey("2001:db8:abcd:13::1")).not.toBe(a);
    expect(clientKey("2001:0db8:abcd:0012:0:0:0:5")).toBe(a);
  });

  it("handles a missing address", () => {
    expect(clientKey(undefined)).toBe("unknown");
  });
});
