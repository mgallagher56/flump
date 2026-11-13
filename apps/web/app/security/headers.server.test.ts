// @vitest-environment node
// Node's Response.redirect has immutable headers (like authkit/fetch responses); happy-dom's does not.
import { describe, expect, it } from "vitest";
import { applyCachePolicy, applySecurityHeaders, SECURITY_HEADERS } from "./headers.server";

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
    expect(res.headers.get("cross-origin-resource-policy")).toBe("same-origin");
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

describe("applyCachePolicy", () => {
  it("sets no-store and Pragma by default", () => {
    const res = applyCachePolicy(new Response("x"));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
    expect(res.headers.has("vary")).toBe(false);
  });

  it("makes a response that sets a cookie no-store, even with a private Cache-Control", () => {
    const res = new Response("x", { headers: { "Cache-Control": "private, max-age=60" } });
    res.headers.append("Set-Cookie", "wos-session=abc; Path=/; HttpOnly");
    const out = applyCachePolicy(res);
    expect(out.headers.get("cache-control")).toBe("no-store");
    expect(out.headers.getSetCookie()).toEqual(["wos-session=abc; Path=/; HttpOnly"]);
  });

  it.each(["public, max-age=3600", "max-age=60", "s-maxage=60", "public"])(
    "replaces the weak value %s with no-store",
    (value) => {
      const res = applyCachePolicy(new Response("x", { headers: { "Cache-Control": value } }));
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("pragma")).toBe("no-cache");
    },
  );

  it("keeps an existing no-store untouched", () => {
    const res = applyCachePolicy(new Response("x", { headers: { "Cache-Control": "no-store" } }));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.has("vary")).toBe(false);
  });

  it("keeps private and adds Vary: Cookie, preserving existing Vary values", () => {
    const res = applyCachePolicy(
      new Response("x", { headers: { "Cache-Control": "private, max-age=60", Vary: "Accept" } }),
    );
    expect(res.headers.get("cache-control")).toBe("private, max-age=60");
    expect(res.headers.get("vary")).toBe("Accept, Cookie");
  });

  it("does not duplicate Vary: Cookie", () => {
    const res = applyCachePolicy(
      new Response("x", { headers: { "Cache-Control": "private", Vary: "Cookie" } }),
    );
    expect(res.headers.get("vary")).toBe("Cookie");
  });

  it("copies an immutable-headers redirect and keeps Location", () => {
    const out = applyCachePolicy(Response.redirect("https://example.com/next", 302));
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://example.com/next");
    expect(out.headers.get("cache-control")).toBe("no-store");
  });
});
