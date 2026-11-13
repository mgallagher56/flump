// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "../app/security/headers.server";
import { securityHeaders } from "./securityHeaders";

describe("securityHeaders", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  afterEach(() => server?.close());

  async function get(handler: express.RequestHandler) {
    const app = express();
    app.use(securityHeaders());
    app.use(handler);
    server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    return fetch(`http://127.0.0.1:${port}/`);
  }

  it("stamps the full set on a plain response", async () => {
    const res = await get((_req, r) => {
      r.status(500).send("boom");
    });
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(name)).toBe(value);
    }
  });

  it("lets the app's own appended header win without duplicating", async () => {
    const res = await get((_req, r) => {
      r.append("Content-Security-Policy", "default-src 'self'; script-src 'nonce-abc'");
      r.append("Set-Cookie", "a=b");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'self'; script-src 'nonce-abc'",
    );
    expect(res.headers.get("strict-transport-security")).toBe(
      SECURITY_HEADERS["Strict-Transport-Security"],
    );
  });

  it("passes the app's report-only CSP through once next to the enforced default (E20-N11)", async () => {
    const res = await get((_req, r) => {
      // What @react-router/express does with the middleware's response headers.
      r.append("Content-Security-Policy", "frame-ancestors 'none'");
      r.append("Content-Security-Policy-Report-Only", "default-src 'self'; script-src 'nonce-abc'");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(res.headers.get("content-security-policy-report-only")).toBe(
      "default-src 'self'; script-src 'nonce-abc'",
    );
  });

  it("keeps the enforced frame-ancestors default when the app sends only a report-only CSP", async () => {
    const res = await get((_req, r) => {
      r.append("Content-Security-Policy-Report-Only", "default-src 'self'");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });

  it("does not double a header the app sets with the same value", async () => {
    const res = await get((_req, r) => {
      r.append("X-Frame-Options", "DENY");
      r.send("ok");
    });
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
