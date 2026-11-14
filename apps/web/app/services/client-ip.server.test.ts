// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_KEY_ENV,
  CLIENT_IP_SIG_HEADER,
  clientIpFromRequest,
  signedClientIpHeaders,
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
