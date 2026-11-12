import { describe, expect, it } from "vitest";
import { applySecurityHeaders, SECURITY_HEADERS } from "./headers.server";

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

  it("copes with immutable headers", () => {
    const out = applySecurityHeaders(Response.redirect("https://example.com/", 302));
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://example.com/");
    expect(out.headers.get("x-frame-options")).toBe("DENY");
  });
});
