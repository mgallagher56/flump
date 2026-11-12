// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config.server", () => ({ apiConfig: { apiBaseUrl: "https://backend.test" } }));
vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import {
  API_ALLOW_LIST,
  handleApiProxy,
  MAX_BODY_BYTES,
  matchAllowList,
  normaliseApiPath,
  type ProxyDeps,
  type ProxySession,
  resetWriteLimiter,
} from "./api-proxy.server";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const ORIGIN = "https://app.flump.test";

const session: ProxySession = { userId: "user_1", accessToken: "secret-token", cookies: [] };

function req(
  method: string,
  path: string,
  opts: { headers?: Record<string, string | null>; body?: string } = {},
): Request {
  const headers = new Headers({
    "X-Flump-Request": "1",
    Origin: ORIGIN,
    ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
  });
  for (const [k, v] of Object.entries(opts.headers ?? {})) {
    if (v === null) headers.delete(k);
    else headers.set(k, v);
  }
  return new Request(`${ORIGIN}${path}`, { method, headers, body: opts.body });
}

const run = (request: Request, deps: ProxyDeps = {}) =>
  handleApiProxy({ request, params: {}, context: {} } as never, {
    resolveSession: async () => session,
    fetchImpl: vi.fn(async () => new Response("{}", { status: 200 })) as never,
    ...deps,
  });

beforeEach(() => resetWriteLimiter());

describe("allow-list", () => {
  it("is exactly the E20 inventory (snapshot: fails if it grows)", () => {
    expect(
      API_ALLOW_LIST.map((r) => `${[...r.methods].join(",")} ${r.pattern}`),
    ).toMatchInlineSnapshot(`
      [
        "PATCH /user-profile",
        "PATCH /user-profile/checklist",
        "POST /user-profile/send-password-reset",
        "POST /user-profile/reset-financial-data",
        "GET,POST /budget-entries",
        "PATCH,DELETE /budget-entries/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        "POST /budget-entries/seed-defaults",
        "POST /budget-entries/categories",
        "GET,POST /accounts",
        "PATCH /accounts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
      ]
    `);
  });

  it.each([
    ["PATCH", "/user-profile"],
    ["PATCH", "/user-profile/checklist"],
    ["POST", "/user-profile/send-password-reset"],
    ["POST", "/user-profile/reset-financial-data"],
    ["GET", "/budget-entries"],
    ["POST", "/budget-entries"],
    ["PATCH", `/budget-entries/${UUID}`],
    ["DELETE", `/budget-entries/${UUID}`],
    ["POST", "/budget-entries/seed-defaults"],
    ["POST", "/budget-entries/categories"],
    ["GET", "/accounts"],
    ["POST", "/accounts"],
    ["PATCH", `/accounts/${UUID}`],
  ])("passes %s %s through to the backend with the bearer token", async (method, path) => {
    const fetchImpl = vi.fn(async () => new Response('{"ok":1}', { status: 200 }));
    const body = method === "GET" || method === "DELETE" ? undefined : '{"a":1}';
    const res = await run(req(method, `/api${path}`, { body }), { fetchImpl: fetchImpl as never });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: 1 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://backend.test${path}`);
    expect(init.headers).toEqual({
      Authorization: "Bearer secret-token",
      ...(body ? { "Content-Type": "application/json" } : {}),
    });
  });

  it.each([
    ["GET", "/api/user-profile"],
    ["DELETE", "/api/accounts"],
    ["PUT", "/api/accounts"],
    ["GET", "/api/accounts/not-a-uuid"],
    ["GET", "/api/portfolio-snapshot"],
    ["GET", "/api/bank-connections"],
    ["GET", `/api/accounts/${UUID}/extra`],
    ["GET", "/api/"],
    ["GET", "/api"],
  ])("returns 404 for %s %s", async (method, path) => {
    const fetchImpl = vi.fn();
    const res = await run(req(method, path), { fetchImpl: fetchImpl as never });
    expect(res.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("path normalisation", () => {
  it.each([
    "/api/accounts/../user-profile",
    "/api/%2e%2e/accounts",
    "/api/%2E%2E/accounts",
    "/api/accounts%2fx",
    "/api/accounts%2Fx",
    "/api//accounts",
    "/api/accounts//",
    "/api/accounts%5cx",
    "/api/accounts\\x",
    "/api/accounts/%2e",
  ])("rejects %s", (path) => {
    expect(normaliseApiPath(path)).toBeNull();
  });

  it("accepts a clean path and trims one trailing slash", () => {
    expect(normaliseApiPath("/api/accounts")).toBe("/accounts");
    expect(normaliseApiPath("/api/accounts/")).toBe("/accounts");
    expect(normaliseApiPath("/accounts")).toBeNull();
    expect(matchAllowList("GET", "/accounts")).toBe(true);
  });

  it("returns 404 for an encoded traversal attempt even with valid headers and session", async () => {
    const fetchImpl = vi.fn();
    const res = await run(req("GET", "/api/budget-entries%2f%2e%2e%2faccounts"), {
      fetchImpl: fetchImpl as never,
    });
    expect(res.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("CSRF checks", () => {
  it("403 when X-Flump-Request is missing", async () => {
    const res = await run(req("GET", "/api/accounts", { headers: { "X-Flump-Request": null } }));
    expect(res.status).toBe(403);
  });

  it("403 when X-Flump-Request is not 1", async () => {
    const res = await run(req("GET", "/api/accounts", { headers: { "X-Flump-Request": "0" } }));
    expect(res.status).toBe(403);
  });

  it("403 for a foreign Origin", async () => {
    const res = await run(
      req("POST", "/api/accounts", { body: "{}", headers: { Origin: "https://evil.test" } }),
    );
    expect(res.status).toBe(403);
  });

  it("403 for a write with no Origin, but a same-origin GET without Origin passes", async () => {
    expect(
      (await run(req("POST", "/api/accounts", { body: "{}", headers: { Origin: null } }))).status,
    ).toBe(403);
    expect((await run(req("GET", "/api/accounts", { headers: { Origin: null } }))).status).toBe(
      200,
    );
  });

  it("honours x-forwarded-proto/host behind a proxy", async () => {
    const request = new Request("http://internal:3000/api/accounts", {
      method: "GET",
      headers: {
        "X-Flump-Request": "1",
        Origin: "https://app.flump.test",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "app.flump.test",
      },
    });
    expect((await run(request)).status).toBe(200);
  });
});

describe("session", () => {
  it("401 with no session, without calling the backend", async () => {
    const fetchImpl = vi.fn();
    const res = await run(req("GET", "/api/accounts"), {
      resolveSession: async () => null,
      fetchImpl: fetchImpl as never,
    });
    expect(res.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("401 when the auth helper throws", async () => {
    const res = await run(req("GET", "/api/accounts"), {
      resolveSession: async () => {
        throw new Error("boom");
      },
    });
    expect(res.status).toBe(401);
  });

  it("forwards the session-refresh cookie but never the backend's Set-Cookie", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("{}", { status: 200, headers: { "Set-Cookie": "backend=1; Path=/" } }),
    );
    const res = await run(req("GET", "/api/accounts"), {
      resolveSession: async () => ({ ...session, cookies: ["wos-session=refreshed; Path=/"] }),
      fetchImpl: fetchImpl as never,
    });
    expect(res.headers.getSetCookie()).toEqual(["wos-session=refreshed; Path=/"]);
  });
});

describe("body handling", () => {
  it("413 for a declared body over the cap", async () => {
    const fetchImpl = vi.fn();
    const body = JSON.stringify({ pad: "x".repeat(MAX_BODY_BYTES) });
    const res = await run(req("POST", "/api/accounts", { body }), {
      fetchImpl: fetchImpl as never,
    });
    expect(res.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("413 for an over-cap body with no content-length (streamed)", async () => {
    const chunk = new TextEncoder().encode("x".repeat(MAX_BODY_BYTES));
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(new TextEncoder().encode("y"));
        controller.close();
      },
    });
    const request = new Request(`${ORIGIN}/api/accounts`, {
      method: "POST",
      headers: { "X-Flump-Request": "1", Origin: ORIGIN, "Content-Type": "application/json" },
      body: stream,
      // @ts-expect-error duplex is required for stream bodies in Node
      duplex: "half",
    });
    expect((await run(request)).status).toBe(413);
  });

  it("accepts a body at the cap", async () => {
    const pad = "x".repeat(MAX_BODY_BYTES - 10);
    const body = JSON.stringify({ p: pad }).slice(0, MAX_BODY_BYTES);
    expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(MAX_BODY_BYTES);
    expect((await run(req("POST", "/api/accounts", { body }))).status).toBe(200);
  });

  it("415 for a body without a JSON Content-Type", async () => {
    const res = await run(
      req("POST", "/api/accounts", { body: "a=1", headers: { "Content-Type": "text/plain" } }),
    );
    expect(res.status).toBe(415);
  });

  it("forwards only Content-Type and Authorization upstream", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await run(
      req("POST", "/api/accounts", {
        body: "{}",
        headers: { Cookie: "wos-session=abc", "X-Custom": "1", Authorization: "Bearer attacker" },
      }),
      { fetchImpl: fetchImpl as never },
    );
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(Object.keys(init.headers as object).sort()).toEqual(["Authorization", "Content-Type"]);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });
});

describe("rate limit", () => {
  it("429s the 121st write per user in a minute, not reads, and resets after the window", async () => {
    let t = 1_000_000;
    const deps = { now: () => t };
    for (let i = 0; i < 120; i++) {
      expect((await run(req("POST", "/api/accounts", { body: "{}" }), deps)).status).toBe(200);
    }
    const limited = await run(req("POST", "/api/accounts", { body: "{}" }), deps);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect((await run(req("GET", "/api/accounts"), deps)).status).toBe(200);

    const other = await run(req("POST", "/api/accounts", { body: "{}" }), {
      ...deps,
      resolveSession: async () => ({ ...session, userId: "user_2" }),
    });
    expect(other.status).toBe(200);

    t += 60_001;
    expect((await run(req("POST", "/api/accounts", { body: "{}" }), deps)).status).toBe(200);
  });
});

describe("error mapping", () => {
  const upstream = (status: number, body?: string) => ({
    fetchImpl: vi.fn(async () => new Response(body ?? null, { status })) as never,
  });

  it("passes 401 and 403 through without backend text", async () => {
    for (const status of [401, 403]) {
      const res = await run(req("GET", "/api/accounts"), upstream(status, '{"message":"Secret"}'));
      expect(res.status).toBe(status);
      expect(JSON.stringify(await res.json())).not.toContain("Secret");
    }
  });

  it("keeps the validation message for other 4xx", async () => {
    const res = await run(req("GET", "/api/accounts"), upstream(400, '{"message":"Nope"}'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ kind: "client", message: "Nope" });
  });

  it("turns 5xx and redirects into a generic 502", async () => {
    for (const status of [500, 503, 302]) {
      const res = await run(req("GET", "/api/accounts"), upstream(status, '{"message":"Secret"}'));
      expect(res.status).toBe(502);
      expect(JSON.stringify(await res.json())).not.toContain("Secret");
    }
  });

  it("503 when the backend is unreachable", async () => {
    const res = await run(req("GET", "/api/accounts"), {
      fetchImpl: vi.fn(async () => {
        throw new TypeError("fetch failed");
      }) as never,
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ kind: "unavailable" });
  });

  it("times out a hung backend as 503", async () => {
    const res = await run(req("GET", "/api/accounts"), {
      timeoutMs: 20,
      fetchImpl: vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ) as never,
    });
    expect(res.status).toBe(503);
  });

  it("returns 204 with no body and no-store caching", async () => {
    const res = await run(req("DELETE", `/api/budget-entries/${UUID}`), upstream(204));
    expect(res.status).toBe(204);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.text()).toBe("");
  });
});
