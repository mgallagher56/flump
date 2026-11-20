// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runWithRequestId } from "~/security/request-id.server";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_KEY_ENV,
  CLIENT_IP_SIG_HEADER,
  clientIpFromRequest,
  signedClientIpHeaders,
  withClientIpHeaders,
} from "./client-ip.server";

// A made-up test key, not a real secret.
const KEY = "k".repeat(40);
const NOW = 1_794_632_012_000;
const request = (xff?: string) =>
  new Request("https://app.flump.test/", { headers: xff ? { "X-Forwarded-For": xff } : {} });

describe("signed client IP (M9, web side)", () => {
  it("signs the last X-Forwarded-For entry in the format the backend verifies", () => {
    const headers = signedClientIpHeaders(
      request("6.6.6.6, 203.0.113.7"),
      { [CLIENT_IP_KEY_ENV]: KEY },
      NOW,
    );
    const seconds = Math.floor(NOW / 1000);
    const mac = createHmac("sha256", KEY).update(`v1|203.0.113.7|${seconds}`).digest("hex");
    expect(headers).toEqual({
      [CLIENT_IP_HEADER]: "203.0.113.7",
      [CLIENT_IP_SIG_HEADER]: `v1=${seconds}.${mac}`,
    });
  });

  it("sends nothing without a key, with a short key, or without a usable address", () => {
    expect(signedClientIpHeaders(request("203.0.113.7"), {}, NOW)).toEqual({});
    expect(
      signedClientIpHeaders(request("203.0.113.7"), { [CLIENT_IP_KEY_ENV]: "short" }, NOW),
    ).toEqual({});
    expect(signedClientIpHeaders(request(), { [CLIENT_IP_KEY_ENV]: KEY }, NOW)).toEqual({});
    expect(signedClientIpHeaders(request("not-an-ip"), { [CLIENT_IP_KEY_ENV]: KEY }, NOW)).toEqual(
      {},
    );
  });

  it("reads IPv6 and refuses junk", () => {
    expect(clientIpFromRequest(request("2001:db8::1"))).toBe("2001:db8::1");
    expect(clientIpFromRequest(request("1.1.1.1, "))).toBeNull();
  });
});

// An IPv6 address with a zone id is a valid address of any length, so it shows the 64-character cap.
const zoned = (length: number) => `fe80::1%${"a".repeat(length - "fe80::1%".length)}`;
const sigFor = (key: string, ip: string) => {
  const seconds = Math.floor(NOW / 1000);
  return `v1=${seconds}.${createHmac("sha256", key).update(`v1|${ip}|${seconds}`).digest("hex")}`;
};

describe("reading the browser address", () => {
  it("is null with no X-Forwarded-For header", () => {
    expect(clientIpFromRequest(request())).toBeNull();
  });

  it("is null when the last entry is not an address", () => {
    expect(clientIpFromRequest(request("203.0.113.7, not-an-ip"))).toBeNull();
  });

  it("accepts an address of 64 characters and refuses a longer one", () => {
    expect(clientIpFromRequest(request(zoned(64)))).toBe(zoned(64));
    expect(clientIpFromRequest(request(zoned(65)))).toBeNull();
  });
});

describe("the signing key", () => {
  it("ignores spaces around the key, and counts its length without them", () => {
    const headers = signedClientIpHeaders(
      request("203.0.113.7"),
      { [CLIENT_IP_KEY_ENV]: `  ${KEY}  ` },
      NOW,
    );
    expect(headers[CLIENT_IP_SIG_HEADER]).toBe(sigFor(KEY, "203.0.113.7"));
    // 31 characters padded with spaces is still too short.
    const short = ` ${"k".repeat(31)} `;
    expect(
      signedClientIpHeaders(request("203.0.113.7"), { [CLIENT_IP_KEY_ENV]: short }, NOW),
    ).toEqual({});
  });

  it("accepts a key of exactly 32 characters", () => {
    const key = "k".repeat(32);
    const headers = signedClientIpHeaders(
      request("203.0.113.7"),
      { [CLIENT_IP_KEY_ENV]: key },
      NOW,
    );
    expect(headers[CLIENT_IP_SIG_HEADER]).toBe(sigFor(key, "203.0.113.7"));
  });
});

describe("withClientIpHeaders (calls with no Request to hand)", () => {
  const env = { [CLIENT_IP_KEY_ENV]: KEY };
  const inRequest = <T>(clientIp: string, fn: () => T) =>
    runWithRequestId("req-12345678", fn, { clientIp });

  it("adds the signed address of the current request and keeps the caller's headers", () => {
    const out = inRequest("203.0.113.7", () =>
      withClientIpHeaders({ Authorization: "Bearer t" }, env, NOW),
    );
    expect(out).toEqual({
      Authorization: "Bearer t",
      [CLIENT_IP_HEADER]: "203.0.113.7",
      [CLIENT_IP_SIG_HEADER]: sigFor(KEY, "203.0.113.7"),
    });
  });

  it("leaves the headers alone outside a request", () => {
    expect(withClientIpHeaders({ Authorization: "Bearer t" }, env, NOW)).toEqual({
      Authorization: "Bearer t",
    });
  });

  it("leaves a caller-set address alone, whatever its case", () => {
    const own = { Authorization: "Bearer t", "X-Flump-Client-IP": "198.51.100.1" };
    const out = inRequest("203.0.113.7", () => withClientIpHeaders(own, env, NOW));
    expect(out).toBe(own);
  });

  it("signs nothing when the stored address is not a usable address", () => {
    for (const ip of ["not-an-ip", zoned(65)]) {
      expect(inRequest(ip, () => withClientIpHeaders({}, env, NOW))).toEqual({});
    }
    expect(inRequest(zoned(64), () => withClientIpHeaders({}, env, NOW))).toEqual({
      [CLIENT_IP_HEADER]: zoned(64),
      [CLIENT_IP_SIG_HEADER]: sigFor(KEY, zoned(64)),
    });
  });
});
