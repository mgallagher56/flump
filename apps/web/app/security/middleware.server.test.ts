// @vitest-environment node
// happy-dom's Request drops forbidden headers such as Sec-Fetch-Site; Node's keeps them.
import { describe, expect, it, vi } from "vitest";
import { securityMiddleware } from "./middleware.server";
import { recordRefreshedCookies } from "./session-cookies.server";

type Args = Parameters<typeof securityMiddleware>[0];

function run(request: Request, next: () => Promise<Response>, context: object = {}) {
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

  it("sends no-store on the 403 CSRF rejection and keeps public pages cacheable", async () => {
    const rejected = await run(
      new Request(`${APP}/logout`, { method: "POST", headers: { origin: "https://evil.example" } }),
      ok,
    );
    expect(rejected.headers.get("cache-control")).toBe("no-store");
    const pub = await run(new Request(`${APP}/tools/mortgage`), ok);
    expect(pub.headers.has("cache-control")).toBe(false);
  });

  it("keeps the API proxy's own no-store untouched", async () => {
    const proxied = () =>
      Promise.resolve(new Response("{}", { headers: { "Cache-Control": "no-store" } }));
    const res = await run(new Request(`${APP}/api/accounts`), proxied);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.has("pragma")).toBe(false);
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
    const context = {};
    recordRefreshedCookies(context, new Headers({ "Set-Cookie": NEW }));
    recordRefreshedCookies(context, new Headers({ "Set-Cookie": NEW }));
    const res = await run(new Request(`${APP}/app`), ok, context);
    expect(res.headers.getSetCookie()).toEqual([NEW]);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("forwards on redirects and resource-route responses", async () => {
    const context = {};
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const redirect = () =>
      Promise.resolve(new Response(null, { status: 302, headers: { Location: "/app" } }));
    const res = await run(new Request(`${APP}/api/accounts`), redirect, context);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/app");
    expect(res.headers.getSetCookie()).toEqual([NEW]);
  });

  it("does not overwrite a response that already sets the session cookie (logout, proxy)", async () => {
    const context = {};
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
    const context = {};
    recordRefreshedCookies(context, { "Set-Cookie": NEW });
    const other = () =>
      Promise.resolve(new Response("ok", { headers: { "Set-Cookie": "flump_has_session=1" } }));
    const res = await run(new Request(`${APP}/app`), other, context);
    expect(res.headers.getSetCookie()).toEqual(["flump_has_session=1", NEW]);
  });

  it("keeps one cookie per name when several loaders refresh (last wins)", async () => {
    const context = {};
    recordRefreshedCookies(context, { "Set-Cookie": "wos-session=a; Path=/" });
    recordRefreshedCookies(context, { "Set-Cookie": "wos-session=b; Path=/" });
    const res = await run(new Request(`${APP}/app`), ok, context);
    expect(res.headers.getSetCookie()).toEqual(["wos-session=b; Path=/"]);
  });

  it("does not leak cookies between requests", async () => {
    recordRefreshedCookies({}, { "Set-Cookie": NEW });
    const res = await run(new Request(`${APP}/app`), ok, {});
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("preserves body and status", async () => {
    const context = {};
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
