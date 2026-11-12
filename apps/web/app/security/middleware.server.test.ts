// @vitest-environment node
// happy-dom's Request drops forbidden headers such as Sec-Fetch-Site; Node's keeps them.
import { describe, expect, it, vi } from "vitest";
import { securityMiddleware } from "./middleware.server";

type Args = Parameters<typeof securityMiddleware>[0];

function run(request: Request, next: () => Promise<Response>) {
  const args = { request, params: {}, context: {} } as unknown as Args;
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
