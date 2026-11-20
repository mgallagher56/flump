import { describe, expect, it } from "vitest";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_KEY_ENV,
  CLIENT_IP_SIG_HEADER,
  resolveClientIpHmacKey,
  signClientIp,
  verifiedClientIp,
} from "./signed-client-ip";

// A made-up test key, not a real secret.
const KEY = "k".repeat(40);
const NOW = 1_794_632_012_000;

const headers = (ip: string, sig: string) => ({
  [CLIENT_IP_HEADER]: ip,
  [CLIENT_IP_SIG_HEADER]: sig,
});

describe("signed client IP (M9)", () => {
  it("accepts a fresh signature made with the shared key", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    expect(verifiedClientIp(headers("203.0.113.7", sig), KEY, NOW + 5_000)).toBe("203.0.113.7");
    const v6 = signClientIp(KEY, "2001:db8::1", NOW);
    expect(verifiedClientIp(headers("2001:db8::1", v6), KEY, NOW)).toBe("2001:db8::1");
  });

  it("refuses a bad signature, another key, or a signature moved to another address", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    const tampered = `${sig.slice(0, -1)}${sig.endsWith("0") ? "1" : "0"}`;
    expect(verifiedClientIp(headers("203.0.113.7", tampered), KEY, NOW)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", sig), `${KEY}-other`, NOW)).toBeNull();
    expect(verifiedClientIp(headers("198.51.100.1", sig), KEY, NOW)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", "v1=123.zz"), KEY, NOW)).toBeNull();
  });

  it("refuses a stale or future signature outside the 60 second window", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    expect(verifiedClientIp(headers("203.0.113.7", sig), KEY, NOW + 60_000)).toBe("203.0.113.7");
    expect(verifiedClientIp(headers("203.0.113.7", sig), KEY, NOW + 62_000)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", sig), KEY, NOW - 62_000)).toBeNull();
  });

  it("refuses missing headers, repeated headers, non-addresses and an unset key", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    expect(verifiedClientIp({}, KEY, NOW)).toBeNull();
    expect(verifiedClientIp(undefined, KEY, NOW)).toBeNull();
    expect(
      verifiedClientIp(
        { [CLIENT_IP_HEADER]: ["203.0.113.7", "1.1.1.1"], [CLIENT_IP_SIG_HEADER]: sig },
        KEY,
        NOW,
      ),
    ).toBeNull();
    const junk = signClientIp(KEY, "not-an-ip", NOW);
    expect(verifiedClientIp(headers("not-an-ip", junk), KEY, NOW)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", sig), null, NOW)).toBeNull();
  });

  it("refuses a signature with anything before or after the v1=<seconds>.<hex> form", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    expect(verifiedClientIp(headers("203.0.113.7", `x${sig}`), KEY, NOW)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", `${sig}0`), KEY, NOW)).toBeNull();
    expect(verifiedClientIp(headers("203.0.113.7", `${sig}x`), KEY, NOW)).toBeNull();
  });

  it("refuses a signature without an address, without throwing", () => {
    const sig = signClientIp(KEY, "203.0.113.7", NOW);
    expect(verifiedClientIp({ [CLIENT_IP_SIG_HEADER]: sig }, KEY, NOW)).toBeNull();
  });

  it("accepts an address of up to 64 characters and refuses a longer one", () => {
    // Node accepts an IPv6 address with a zone id, so a long zone id makes a long valid address.
    const at64 = `fe80::1%${"a".repeat(56)}`; // 8 + 56 = 64 characters
    const at65 = `fe80::1%${"a".repeat(57)}`; // 65 characters
    expect(verifiedClientIp(headers(at64, signClientIp(KEY, at64, NOW)), KEY, NOW)).toBe(at64);
    expect(verifiedClientIp(headers(at65, signClientIp(KEY, at65, NOW)), KEY, NOW)).toBeNull();
  });

  it("accepts a key of exactly 32 characters and ignores a 31 character key with a warning", () => {
    expect(resolveClientIpHmacKey({ [CLIENT_IP_KEY_ENV]: "k".repeat(32) })).toEqual({
      key: "k".repeat(32),
    });
    const short = resolveClientIpHmacKey({ [CLIENT_IP_KEY_ENV]: "k".repeat(31) });
    expect(short.key).toBeNull();
    expect(short.warning).toContain(CLIENT_IP_KEY_ENV);
  });

  it("ignores an unset or short key, naming only the variable", () => {
    expect(resolveClientIpHmacKey({}).key).toBeNull();
    expect(resolveClientIpHmacKey({}).warning).toContain(CLIENT_IP_KEY_ENV);
    const short = resolveClientIpHmacKey({ [CLIENT_IP_KEY_ENV]: "short" });
    expect(short.key).toBeNull();
    expect(resolveClientIpHmacKey({ [CLIENT_IP_KEY_ENV]: KEY })).toEqual({ key: KEY });
  });
});
