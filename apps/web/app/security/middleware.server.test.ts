// @vitest-environment node
// happy-dom's Request drops forbidden headers such as Sec-Fetch-Site; Node's keeps them.
import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { nonceContext } from "./csp.server";
import { securityMiddleware } from "./middleware.server";
import { recordRefreshedCookies } from "./session-cookies.server";

type Args = Parameters<typeof securityMiddleware>[0];

function run(
  request: Request,
  next: () => Promise<Response>,
  context: object = new RouterContextProvider(),
) {
  const args = { request, params: {}, context } as unknown as Args;
  return securityMiddleware(args, next) as Promise<Response>;
}

const ok = () =>
  Promise.resolve(new Response("<html></html>", { headers: { "Content-Type": "text/html" } }));
const APP = "https://app.flump.test";

describe("securityMiddleware", () => {
  it("sets the headers on a document response", async () => {
    const res = await run(new Request(`${APP}/app`), ok);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(res.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("sets the headers on a .data response", async () => {
    const data = () =>
      Promise.resolve(new Response("[]", { headers: { "Content-Type": "text/x-script" } }));
    const res = await run(new Request(`${APP}/app.data`), data);
    expect(res.headers.get("content-type")).toBe("text/x-script");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("sends no-store on authenticated and personal-data routes", async () => {
    for (const path of [
      "/",
      "/app",
      "/app/profile.data",
      "/app/onboarding",
      "/callback",
      "/logout",
    ]) {
      const res = await run(new Request(`${APP}${path}`), ok);
      expect(res.headers.get("cache-control"), path).toBe("no-store");
      expect(res.headers.get("pragma"), path).toBe("no-cache");
    }
  });

  it("sends no-store on /tools and /tools.data for a signed-in cookie request", async () => {
    for (const path of ["/tools", "/tools.data", "/tools/mortgage", "/tools/mortgage.data"]) {
      const res = await run(
        new Request(`${APP}${path}`, { headers: { cookie: "__Host-wos-session=abc" } }),
        ok,
      );
      expect(res.headers.get("cache-control"), path).toBe("no-store");
    }
  });

  it("sends no-store on anonymous /tools too (no public-cacheable routes)", async () => {
    const res = await run(new Request(`${APP}/tools`), ok);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sends no-store on a response that sets a cookie, via refresh or the route itself", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": "__Host-wos-session=n; Path=/; Secure" });
    const refreshed = await run(new Request(`${APP}/tools`), ok, context);
    expect(refreshed.headers.get("cache-control")).toBe("no-store");
    const own = () =>
      Promise.resolve(
        new Response("ok", { headers: { "Set-Cookie": "a=1", "Cache-Control": "private" } }),
      );
    expect((await run(new Request(`${APP}/x`), own)).headers.get("cache-control")).toBe("no-store");
  });

  it("overrides a weak route Cache-Control and keeps the API proxy's no-store", async () => {
    const weak = () =>
      Promise.resolve(new Response("{}", { headers: { "Cache-Control": "public, max-age=600" } }));
    const res = await run(new Request(`${APP}/tools`), weak);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const proxied = () =>
      Promise.resolve(new Response("{}", { headers: { "Cache-Control": "no-store" } }));
    const api = await run(new Request(`${APP}/api/accounts`), proxied);
    expect(api.headers.get("cache-control")).toBe("no-store");
  });

  it("sends no-store on the 403 CSRF rejection", async () => {
    const rejected = await run(
      new Request(`${APP}/logout`, { method: "POST", headers: { origin: "https://evil.example" } }),
      ok,
    );
    expect(rejected.headers.get("cache-control")).toBe("no-store");
  });

  it("leaves GET unaffected without Origin (callback and OAuth redirects)", async () => {
    const next = vi.fn(ok);
    const res = await run(new Request(`${APP}/callback?code=x`), next);
    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects a foreign-Origin POST with 403 and does not call next", async () => {
    const next = vi.fn(ok);
    const res = await run(
      new Request(`${APP}/logout`, { method: "POST", headers: { origin: "https://evil.example" } }),
      next,
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(next).not.toHaveBeenCalled();
  });

  it("passes a same-origin POST (Origin), as logout does", async () => {
    const res = await run(
      new Request(`${APP}/logout`, { method: "POST", headers: { origin: APP } }),
      ok,
    );
    expect(res.status).toBe(200);
  });

  it("passes a same-origin POST (Sec-Fetch-Site), as the /api proxy does", async () => {
    const res = await run(
      new Request(`${APP}/api/accounts`, {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
      }),
      ok,
    );
    expect(res.status).toBe(200);
  });

  it("rejects a POST with neither Origin nor Sec-Fetch-Site", async () => {
    const res = await run(new Request(`${APP}/logout`, { method: "POST" }), ok);
    expect(res.status).toBe(403);
  });
});

describe("securityMiddleware session refresh cookies (E20-N2)", () => {
  const NEW = "__Host-wos-session=new; Path=/; Secure; HttpOnly";

  it("appends the refreshed Set-Cookie exactly once, with the security headers", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, new Headers({ "Set-Cookie": NEW }));
    recordRefreshedCookies(context, new Headers({ "Set-Cookie": NEW }));
    const res = await run(new Request(`${APP}/app`), ok, context);
    expect(res.headers.getSetCookie()).toEqual([NEW]);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("forwards on redirects and resource-route responses", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const redirect = () =>
      Promise.resolve(new Response(null, { status: 302, headers: { Location: "/app" } }));
    const res = await run(new Request(`${APP}/api/accounts`), redirect, context);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/app");
    expect(res.headers.getSetCookie()).toEqual([NEW]);
  });

  it("does not overwrite a response that already sets the session cookie (logout, proxy)", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const destroyed = "__Host-wos-session=; Max-Age=0; Path=/";
    const logout = () =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: [["Set-Cookie", destroyed]] as [string, string][],
        }),
      );
    const res = await run(
      new Request(`${APP}/logout`, { method: "POST", headers: { origin: APP } }),
      logout,
      context,
    );
    expect(res.headers.getSetCookie()).toEqual([destroyed]);
  });

  it("keeps other cookies the response sets and adds only the session cookie", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const other = () =>
      Promise.resolve(new Response("ok", { headers: { "Set-Cookie": "flump_has_session=1" } }));
    const res = await run(new Request(`${APP}/app`), other, context);
    expect(res.headers.getSetCookie()).toEqual(["flump_has_session=1", NEW]);
  });

  it("keeps one cookie per name when several loaders refresh (last wins)", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": "wos-session=a; Path=/" });
    recordRefreshedCookies(context, { "Set-Cookie": "wos-session=b; Path=/" });
    const res = await run(new Request(`${APP}/app`), ok, context);
    expect(res.headers.getSetCookie()).toEqual(["wos-session=b; Path=/"]);
  });

  it("does not leak cookies between requests", async () => {
    recordRefreshedCookies({}, { "Set-Cookie": NEW });
    const res = await run(new Request(`${APP}/app`), ok, new RouterContextProvider());
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  describe("report-only CSP (E20-N11)", () => {
    const html = () =>
      Promise.resolve(new Response("<html></html>", { headers: { "Content-Type": "text/html" } }));

    it("sets one report-only CSP with the request nonce and keeps the enforced header", async () => {
      const context = new RouterContextProvider();
      const res = await run(new Request(`${APP}/app`), html, context);
      const nonce = context.get(nonceContext);
      expect(nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
      const policy = res.headers.get("content-security-policy-report-only") ?? "";
      expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(policy).toContain("report-uri /csp-report");
      expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    });

    it("uses a different nonce on every request", async () => {
      const a = new RouterContextProvider();
      const b = new RouterContextProvider();
      await run(new Request(`${APP}/app`), html, a);
      await run(new Request(`${APP}/app`), html, b);
      expect(a.get(nonceContext)).not.toBe(b.get(nonceContext));
    });

    it("allows the WorkOS and marketing origins in form-action", async () => {
      const res = await run(new Request(`${APP}/app`), html);
      const policy = res.headers.get("content-security-policy-report-only") ?? "";
      expect(policy).toMatch(/form-action 'self' https:\/\/api\.workos\.com https?:\/\/[^;*]+;/);
    });

    it("skips non-document responses", async () => {
      const data = () =>
        Promise.resolve(new Response("[]", { headers: { "Content-Type": "text/x-script" } }));
      const res = await run(new Request(`${APP}/app.data`), data);
      expect(res.headers.has("content-security-policy-report-only")).toBe(false);
    });

    it("does not add it to the CSRF rejection", async () => {
      const res = await run(new Request(`${APP}/logout`, { method: "POST" }), html);
      expect(res.status).toBe(403);
      expect(res.headers.has("content-security-policy-report-only")).toBe(false);
    });
  });

  it("preserves body and status", async () => {
    const context = new RouterContextProvider();
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const res = await run(
      new Request(`${APP}/app`),
      () => Promise.resolve(new Response("body", { status: 201 })),
      context,
    );
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("body");
  });
});
