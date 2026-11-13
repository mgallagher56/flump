// @vitest-environment node
// Node's Response.redirect has immutable headers (like authkit/fetch responses); happy-dom's does not.
import { describe, expect, it } from "vitest";
import {
  applyCachePolicy,
  applySecurityHeaders,
  isPublicCacheablePath,
  SECURITY_HEADERS,
} from "./headers.server";

describe("applySecurityHeaders", () => {
  it("sets the full header set", () => {
    const res = applySecurityHeaders(new Response("ok"));
    expect(res.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("never preloads HSTS", () => {
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).not.toMatch(/preload/i);
  });

  it("keeps existing headers, body and status", async () => {
    const res = applySecurityHeaders(
      new Response("body", { status: 201, headers: { "X-Custom": "1" } }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("x-custom")).toBe("1");
    expect(await res.text()).toBe("body");
  });

  it("keeps multiple Set-Cookie headers", () => {
    const original = new Response("ok");
    original.headers.append("Set-Cookie", "wos-session=abc; Path=/; HttpOnly");
    original.headers.append("Set-Cookie", "flump_has_session=; Path=/; Max-Age=0");
    const out = applySecurityHeaders(original);
    expect(out.headers.getSetCookie()).toEqual([
      "wos-session=abc; Path=/; HttpOnly",
      "flump_has_session=; Path=/; Max-Age=0",
    ]);
    expect(out.headers.get("x-frame-options")).toBe("DENY");
  });

  it("copies an immutable-headers redirect with status, Location and body intact", async () => {
    const original = Response.redirect("https://example.com/next", 302);
    expect(() => original.headers.set("x-test", "1")).toThrow();
    const out = applySecurityHeaders(original);
    expect(out).not.toBe(original);
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://example.com/next");
    expect(await out.text()).toBe("");
    expect(out.headers.get("x-frame-options")).toBe("DENY");
    expect(out.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });
});

describe("isPublicCacheablePath", () => {
  it.each(["/tools", "/tools/", "/tools/mortgage", "/tools.data", "/tools/mortgage.data"])(
    "treats %s as public",
    (path) => expect(isPublicCacheablePath(path)).toBe(true),
  );

  it.each([
    "/",
    "/_root.data",
    "/app",
    "/app/accounts/1",
    "/app.data",
    "/api/accounts",
    "/login",
    "/signUp",
    "/callback",
    "/logout",
    "/sandbox",
    "/toolsmith",
    "/anything/else",
  ])("treats %s as private", (path) => expect(isPublicCacheablePath(path)).toBe(false));
});

describe("applyCachePolicy", () => {
  it.each(["/", "/app/profile", "/app/profile.data", "/callback", "/logout", "/login", "/nope"])(
    "sets no-store and Pragma on %s",
    (path) => {
      const res = applyCachePolicy(new Response("x"), path);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("pragma")).toBe("no-cache");
    },
  );

  it("leaves a public page without a Cache-Control header", () => {
    const res = applyCachePolicy(new Response("x"), "/tools/mortgage");
    expect(res.headers.has("cache-control")).toBe(false);
    expect(res.headers.has("pragma")).toBe(false);
  });

  it("keeps a Cache-Control the route already set", () => {
    const res = applyCachePolicy(
      new Response("x", { headers: { "Cache-Control": "public, max-age=60" } }),
      "/robots.txt",
    );
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(res.headers.has("pragma")).toBe(false);
  });

  it("copies an immutable-headers redirect and keeps Location", () => {
    const original = Response.redirect("https://example.com/next", 302);
    const out = applyCachePolicy(original, "/app");
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://example.com/next");
    expect(out.headers.get("cache-control")).toBe("no-store");
  });
});
