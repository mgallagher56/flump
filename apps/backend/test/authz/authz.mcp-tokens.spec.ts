import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { McpToken } from "../../src/entities/mcp-token.entity";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  MISSING_ID,
  probeBody,
  truncateAll,
  USER_A,
  USER_B,
} from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * MCP token management IDOR matrix (E20-N23), real AppModule on real Postgres: mint, list, revoke
 * and the context-pack export across two users. The /mcp transport is authz.mcp.spec.ts.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: mcp-tokens controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);

  let tokenA: { id: string; rawToken: string };

  const tokens = () => h.dataSource.getRepository(McpToken);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "mcp-tokens")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
    const res = await h.call("post", "/mcp-tokens", h.tokens.a, {
      name: "A agent",
      expiryDays: 30,
    });
    expect(res.status).toBe(201);
    tokenA = { id: res.body.id, rawToken: res.body.rawToken };
  });

  const expectTokenAUntouched = async () => {
    const row = await tokens().findOneByOrFail({ id: tokenA.id });
    expect(row.userId).toBe(USER_A);
    expect(row.name).toBe("A agent");
    expect(row.revokedAt).toBeNull();
  };

  describe("authentication (every mcp-tokens route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "delete";
      path: () => string;
      body?: object;
    }> = [
      { key: "GET /mcp-tokens", method: "get", path: () => "/mcp-tokens" },
      {
        key: "POST /mcp-tokens",
        method: "post",
        path: () => "/mcp-tokens",
        body: { name: "x", expiryDays: 30 },
      },
      { key: "DELETE /mcp-tokens/:id", method: "delete", path: () => `/mcp-tokens/${tokenA.id}` },
      {
        key: "GET /mcp-tokens/context-pack",
        method: "get",
        path: () => "/mcp-tokens/context-pack",
      },
      {
        key: "GET /mcp-tokens/:id/activity",
        method: "get",
        path: () => `/mcp-tokens/${tokenA.id}/activity`,
      },
    ];

    it.each(routes.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401, data unchanged",
      async (_key, route) => {
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path(), token, route.body);
          expect(
            res.status,
            `${route.key} with ${token === undefined ? "no" : token === h.tokens.dev ? "dev-bypass" : "expired"} token`,
          ).toBe(401);
        }
        await expectTokenAUntouched();
        expect(await tokens().count()).toBe(1);
        ran(route.key, "authn");
      },
    );
  });

  it("GET /mcp-tokens/:id/activity: A reads own token's activity, B gets 404 for it and a missing id", async () => {
    const own = await h.call("get", `/mcp-tokens/${tokenA.id}/activity`, h.tokens.a);
    expect(own.status).toBe(200);
    expect(own.body).toEqual({ events: [], nextBefore: null });
    expect((await h.call("get", `/mcp-tokens/${tokenA.id}/activity`, h.tokens.b)).status).toBe(404);
    expect((await h.call("get", `/mcp-tokens/${MISSING_ID}/activity`, h.tokens.a)).status).toBe(
      404,
    );
    expect(
      (await h.call("get", `/mcp-tokens/${tokenA.id}/activity?limit=500`, h.tokens.a)).status,
    ).toBe(400);
    await expectTokenAUntouched();
    ran("GET /mcp-tokens/:id/activity");
  });

  it("GET /mcp-tokens/:id/activity: rows sharing one timestamp page without gaps or repeats", async () => {
    // Five rows with an identical created_at (microsecond precision), as a burst of calls can make.
    await h.dataSource.query(
      `INSERT INTO agent_audit_events
         (user_id, token_id, tool_name, outcome, latency_ms, response_bytes, created_at)
       SELECT $1, $2::uuid, 'list_accounts', 'ok', 1, 1, '2026-11-14 10:00:00.123456'
       FROM generate_series(1, 5)`,
      [USER_A, tokenA.id],
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    const sizes: number[] = [];
    do {
      const query: string = cursor ? `&before=${encodeURIComponent(cursor)}` : "";
      const res = await h.call(
        "get",
        `/mcp-tokens/${tokenA.id}/activity?limit=2${query}`,
        h.tokens.a,
      );
      expect(res.status).toBe(200);
      sizes.push(res.body.events.length);
      seen.push(...res.body.events.map((e: { id: string }) => e.id));
      cursor = res.body.nextBefore;
    } while (cursor && sizes.length < 10);
    expect(sizes).toEqual([2, 2, 1]);
    expect(new Set(seen).size).toBe(5);
    // A cursor from another token's row (or a garbled one) never reaches other rows.
    expect(
      (await h.call("get", `/mcp-tokens/${tokenA.id}/activity?before=bm90LWEtdXVpZA`, h.tokens.a))
        .status,
    ).toBe(400);
  });

  it("GET /mcp-tokens: A sees own tokens (never the secret), B sees none of them", async () => {
    const a = await h.call("get", "/mcp-tokens", h.tokens.a);
    expect(a.status).toBe(200);
    expect(a.body.map((t: { id: string }) => t.id)).toEqual([tokenA.id]);
    expect(a.text).not.toContain(tokenA.rawToken);
    expect(a.text).not.toContain("tokenHash");

    const bMint = await h.call("post", "/mcp-tokens", h.tokens.b, {
      name: "B agent",
      expiryDays: 30,
    });
    expect(bMint.status).toBe(201);
    const b = await h.call("get", "/mcp-tokens", h.tokens.b);
    expect(b.status).toBe(200);
    expect(b.body.map((t: { id: string }) => t.id)).toEqual([bMint.body.id]);
    expect(b.text).not.toContain(tokenA.id);
    ran("GET /mcp-tokens");
  });

  it("POST /mcp-tokens: B's probe body mints a token owned by B and leaves A's untouched", async () => {
    const res = await h.call("post", "/mcp-tokens", h.tokens.b, {
      ...probeBody(tokenA.id),
      name: "B agent",
      expiryDays: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(tokenA.id);
    const row = await tokens().findOneByOrFail({ id: res.body.id });
    expect(row.userId).toBe(USER_B);
    // The raw secret is shown once and only its hash is stored.
    expect(row.tokenHash).not.toBe(res.body.rawToken);
    await expectTokenAUntouched();
    expect(await tokens().findBy({ userId: USER_A })).toHaveLength(1);
    ran("POST /mcp-tokens");
  });

  it("DELETE /mcp-tokens/:id: B 404 identical to not-found, A's token still works; A 200 revokes", async () => {
    const asB = await h.call("delete", `/mcp-tokens/${tokenA.id}`, h.tokens.b);
    const missing = await h.call("delete", `/mcp-tokens/${MISSING_ID}`, h.tokens.b);
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asB.body).toEqual(missing.body);
    await expectTokenAUntouched();

    const own = await h.call("delete", `/mcp-tokens/${tokenA.id}`, h.tokens.a);
    expect(own.status).toBe(200);
    expect((await tokens().findOneByOrFail({ id: tokenA.id })).revokedAt).not.toBeNull();
    ran("DELETE /mcp-tokens/:id");
  });

  it("DELETE /mcp-tokens/:id: a non-uuid id is a 400, not a server error", async () => {
    const res = await h.call("delete", "/mcp-tokens/not-a-uuid", h.tokens.b);
    expect(res.status).toBe(400);
    await expectTokenAUntouched();
  });

  it("GET /mcp-tokens/context-pack: A's pack holds A's data, B's pack none of it", async () => {
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Secret Saver",
      type: "Saving",
      balance: 1204.5,
    });
    expect(created.status).toBe(201);

    const a = await h.call("get", "/mcp-tokens/context-pack", h.tokens.a);
    expect(a.status).toBe(200);
    expect(JSON.stringify(a.body)).toContain("1204.5");

    const b = await h.call("get", "/mcp-tokens/context-pack", h.tokens.b);
    expect(b.status).toBe(200);
    const bText = JSON.stringify(b.body);
    expect(bText).not.toContain("1204.5");
    expect(bText).not.toContain(created.body.id);
    ran("GET /mcp-tokens/context-pack");
  });

  describe("MCP access gates do not widen access", () => {
    const withEnv = async (env: Record<string, string>, fn: () => Promise<void>) => {
      const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
      Object.assign(process.env, env);
      try {
        await fn();
      } finally {
        for (const [k, v] of Object.entries(saved)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
    };

    it("an allowlist excluding B refuses B's mint and export, but list and revoke stay own-scoped", async () => {
      await withEnv({ MCP_OPEN_ACCESS: "false", MCP_ALLOWED_USER_IDS: USER_A }, async () => {
        const mint = await h.call("post", "/mcp-tokens", h.tokens.b, { name: "B", expiryDays: 30 });
        expect(mint.status).toBe(404);
        const pack = await h.call("get", "/mcp-tokens/context-pack", h.tokens.b);
        expect(pack.status).toBe(404);
        expect(await tokens().findBy({ userId: USER_B })).toHaveLength(0);

        expect((await h.call("get", "/mcp-tokens", h.tokens.b)).body).toEqual([]);
        expect((await h.call("delete", `/mcp-tokens/${tokenA.id}`, h.tokens.b)).status).toBe(404);
        await expectTokenAUntouched();
      });
    });

    it("the kill switch answers 503 to everyone on mint and export", async () => {
      await withEnv({ MCP_ENABLED: "false" }, async () => {
        for (const token of [h.tokens.a, h.tokens.b]) {
          expect(
            (await h.call("post", "/mcp-tokens", token, { name: "x", expiryDays: 30 })).status,
          ).toBe(503);
          expect((await h.call("get", "/mcp-tokens/context-pack", token)).status).toBe(503);
        }
      });
    });
  });
});
