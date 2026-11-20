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

  it("unwraps a mapped address whose octets have several digits", () => {
    // ::ffff:198.51.100.77 is the IPv4 address 198.51.100.77 (RFC 4291 section 2.5.5.2).
    expect(clientKey("::ffff:198.51.100.77")).toBe("198.51.100.77");
  });

  it("treats only a leading ::ffff: as IPv4-mapped", () => {
    // 1::ffff:203.0.113.9 is a plain IPv6 address: expanded it is
    // 1:0:0:0:0:ffff:cb00:7109, so its /64 is 1:0:0:0.
    expect(clientKey("1::ffff:203.0.113.9")).toBe("1:0:0:0::/64");
  });

  it("returns a value that is not an address as it is", () => {
    // A fifth octet makes it no address at all, so it is keyed as given.
    expect(clientKey("::ffff:203.0.113.9.5")).toBe("::ffff:203.0.113.9.5");
  });

  it("expands a compressed address with groups after the gap", () => {
    // 2001:db8::1:2:3:4:5 has 7 groups written, so :: stands for one zero group:
    // 2001:db8:0:1:2:3:4:5. The first four groups are 2001, db8, 0, 1.
    expect(clientKey("2001:db8::1:2:3:4:5")).toBe("2001:db8:0:1::/64");
  });

  it("expands an address that starts with ::", () => {
    // ::1 is seven zero groups then 1, so its /64 is 0:0:0:0.
    expect(clientKey("::1")).toBe("0:0:0:0::/64");
  });

  it("handles a missing address", () => {
    expect(clientKey(undefined)).toBe("unknown");
  });
});
