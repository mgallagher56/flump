import { describe, expect, it } from "vitest";
import { clientKey } from "./client-key";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIG_HEADER,
  signClientIp,
  verifiedClientIp,
} from "./signed-client-ip";

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

  it("expands a compressed address with groups after the gap", () => {
    // 2001:db8::1:2:3:4:5 has 7 groups written, so :: stands for one zero group:
    // 2001:db8:0:1:2:3:4:5. The first four groups are 2001, db8, 0, 1.
    expect(clientKey("2001:db8::1:2:3:4:5")).toBe("2001:db8:0:1::/64");
  });

  it("expands an address that starts with ::", () => {
    // ::1 is seven zero groups then 1, so its /64 is 0:0:0:0.
    expect(clientKey("::1")).toBe("0:0:0:0::/64");
  });

  it("expands an address that ends with ::", () => {
    // 2001:db8:abcd:12:: writes four groups, so :: stands for the last four, all zero:
    // 2001:db8:abcd:12:0:0:0:0, whose /64 is 2001:db8:abcd:12.
    expect(clientKey("2001:db8:abcd:12::")).toBe("2001:db8:abcd:12::/64");
  });

  it("handles a missing address", () => {
    expect(clientKey(undefined)).toBe("unknown");
    expect(clientKey("")).toBe("unknown");
  });
});

describe("clientKey gives one key per address, however it is written", () => {
  it("counts an embedded IPv4 tail as the two groups it fills", () => {
    // RFC 4291 section 2.2 form 3: the dotted tail is the last 32 bits, two 16-bit groups.
    // 1::2:3:4:5:1.2.3.4 writes six groups plus the tail (two groups), so :: is one zero group:
    // 1:0:2:3:4:5:0102:0304. Its /64 is 1:0:2:3, the same as the address written out in full.
    const key = "1:0:2:3::/64";
    expect(clientKey("1::2:3:4:5:1.2.3.4")).toBe(key);
    expect(clientKey("1:0:2:3:4:5:1.2.3.4")).toBe(key);
    expect(clientKey("1:0:2:3:4:5:102:304")).toBe(key);
  });

  it("expands a short address that ends in an IPv4 tail", () => {
    // 1:2::1.2.3.4 writes two groups plus the tail, so :: is four zero groups:
    // 1:2:0:0:0:0:0102:0304, whose /64 is 1:2:0:0.
    expect(clientKey("1:2::1.2.3.4")).toBe("1:2:0:0::/64");
    expect(clientKey("1:2:0:0:0:0:102:304")).toBe("1:2:0:0::/64");
  });

  it("unwraps an IPv4-mapped address in every spelling", () => {
    // ::ffff:0:0/96 is IPv4-mapped (RFC 4291 section 2.5.5.2): 80 zero bits, 16 one bits, then
    // the IPv4 address. 0102:0304 in hex is 1.2.3.4, so every one of these is 1.2.3.4.
    for (const spelling of [
      "::ffff:1.2.3.4",
      "::FFFF:1.2.3.4",
      "0:0:0:0:0:ffff:1.2.3.4",
      "::ffff:102:304",
      "0:0:0:0:0:ffff:0102:0304",
    ]) {
      expect(clientKey(spelling), spelling).toBe("1.2.3.4");
    }
  });

  it("ignores letter case and leading zeros in the groups", () => {
    // Hex groups are case-insensitive and leading zeros are optional (RFC 4291 section 2.2).
    expect(clientKey("2001:DB8:ABCD:0012::1")).toBe("2001:db8:abcd:12::/64");
  });

  it("drops a zone id, which names a local interface and not a different address", () => {
    // fe80::1%eth0 and fe80::1%2 are fe80::1 on some interface (RFC 4007 section 11): the same
    // address, so the same /64, fe80:0:0:0.
    const key = clientKey("fe80::1");
    expect(key).toBe("fe80:0:0:0::/64");
    expect(clientKey("fe80::1%eth0")).toBe(key);
    expect(clientKey("fe80::1%2")).toBe(key);
  });

  it("puts every value that is not an address in one shared key, never one of its own", () => {
    // A value that is no address must not become a key of its own, or each different bad value
    // would get a fresh bucket. All of these share one fixed key.
    const malformed = [
      "::ffff:203.0.113.9.5",
      "not an address",
      "1.2.3.4 ",
      "999.1.1.1",
      "1:2:3:4:5:6:7:8:9",
      "1.2.3.4%eth0",
      "fe80::1%",
      "%eth0",
    ];
    const keys = new Set(malformed.map((value) => clientKey(value)));
    expect(keys.size).toBe(1);
    const [only] = keys;
    expect(only).toBe("invalid");
  });
});

describe("clientKey at the signed client IP boundary", () => {
  // The web server sends the last X-Forwarded-For entry exactly as the trusted proxy wrote it
  // (apps/web/app/services/client-ip.server.ts, clientIpFromRequest); it checks only that Node
  // reads it as an address. So the backend must key two spellings of one address the same.
  const key = "k".repeat(40);
  const now = Date.UTC(2026, 10, 20, 12, 0, 0);
  const keyFor = (ip: string) =>
    clientKey(
      verifiedClientIp(
        { [CLIENT_IP_HEADER]: ip, [CLIENT_IP_SIG_HEADER]: signClientIp(key, ip, now) },
        key,
        now,
      ) ?? undefined,
    );

  it("gives a signed address the same key in compressed and full form", () => {
    // As above: both are 1:0:2:3:4:5:0102:0304, whose /64 is 1:0:2:3.
    expect(keyFor("1::2:3:4:5:1.2.3.4")).toBe("1:0:2:3::/64");
    expect(keyFor("1:0:2:3:4:5:102:304")).toBe("1:0:2:3::/64");
  });

  it("gives a signed mapped address the key of its IPv4 address", () => {
    expect(keyFor("::ffff:198.51.100.77")).toBe("198.51.100.77");
    expect(keyFor("198.51.100.77")).toBe("198.51.100.77");
  });
});
