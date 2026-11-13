import "reflect-metadata";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { McpToken } from "../../src/entities/mcp-token.entity";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import { type AuthzHarness, bootAuthzHarness, truncateAll } from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * /mcp transport authentication (E20-N22). The route has no AuthGuard by design: it accepts only
 * a personal access token (flump_pat_...). Both verbs must refuse everything else with 401, and a
 * PAT must only ever read its own owner's data. The mcp-tokens management routes are authz.mcp-tokens.spec.ts (N23).
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: /mcp transport (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  let patA: { id: string; rawToken: string };
  let patB: { id: string; rawToken: string };

  const initialize = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "authz-test", version: "0.0.0" },
    },
  };

  const mcp = (verb: "get" | "post", authorization?: string, body: object = initialize) => {
    let req = request(h.app.getHttpServer())
      [verb]("/mcp")
      .set("Accept", "application/json, text/event-stream");
    if (authorization !== undefined) req = req.set("Authorization", authorization);
    if (verb === "post") req = req.set("Content-Type", "application/json").send(body);
    return req;
  };

  const mint = async (token: string, name: string) => {
    const res = await h.call("post", "/mcp-tokens", token, { name, expiryDays: 30 });
    expect(res.status).toBe(201);
    return { id: res.body.id as string, rawToken: res.body.rawToken as string };
  };

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "public" && row.spec === "mcp")
      .map(([key]) => key)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
    patA = await mint(h.tokens.a, "A agent");
    patB = await mint(h.tokens.b, "B agent");
  });

  describe.each(["get", "post"] as const)("%s /mcp", (verb) => {
    const key = `${verb.toUpperCase()} /mcp`;

    // A valid GET opens a long-lived SSE stream, so only POST has a request/response control.
    if (verb === "post") {
      it("a valid PAT is not refused (control)", async () => {
        const res = await mcp(verb, `Bearer ${patA.rawToken}`);
        expect(res.status).toBe(200);
      });
    }

    it("refuses a missing token", async () => {
      expect((await mcp(verb)).status).toBe(401);
      exercised.add(key);
    });

    it("refuses malformed credentials", async () => {
      for (const header of [
        "Bearer",
        "Bearer not-a-pat",
        "Bearer flump_pat_deadbeef",
        `Basic ${patA.rawToken}`,
        patA.rawToken,
      ]) {
        expect((await mcp(verb, header)).status, header).toBe(401);
      }
    });

    it("refuses a user JWT (not a PAT), including the dev-bypass token", async () => {
      for (const token of [h.tokens.a, h.tokens.b, h.tokens.dev]) {
        expect((await mcp(verb, `Bearer ${token}`)).status).toBe(401);
      }
    });

    it("refuses an expired PAT", async () => {
      await h.dataSource
        .getRepository(McpToken)
        .update({ id: patA.id }, { expiresAt: new Date(Date.now() - 3_600_000) });
      expect((await mcp(verb, `Bearer ${patA.rawToken}`)).status).toBe(401);
    });

    it("refuses a revoked PAT", async () => {
      const revoke = await h.call("delete", `/mcp-tokens/${patA.id}`, h.tokens.a);
      expect(revoke.status).toBe(200);
      expect((await mcp(verb, `Bearer ${patA.rawToken}`)).status).toBe(401);
    });
  });

  it("B's PAT cannot read A's data; A's PAT can", async () => {
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Secret Saver",
      type: "Saving",
      balance: 1204.5,
    });
    expect(created.status).toBe(201);

    const read = {
      jsonrpc: "2.0",
      id: 2,
      method: "resources/read",
      params: { uri: "flump://context/accounts" },
    };
    const asA = await mcp("post", `Bearer ${patA.rawToken}`, read);
    expect(asA.status).toBe(200);
    // Names are anonymised in the pack; the id and balance are not.
    expect(asA.text).toContain(created.body.id);
    expect(asA.text).toContain("1204.5");

    const asB = await mcp("post", `Bearer ${patB.rawToken}`, read);
    expect(asB.status).toBe(200);
    expect(asB.text).not.toContain("1204.5");
    expect(asB.text).not.toContain(created.body.id);
  });

  const readResource = (token: string, uri: string) =>
    mcp("post", `Bearer ${token}`, {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/read",
      params: { uri },
    });

  it("B's PAT never returns A's budget or tax data; A's PAT does", async () => {
    const ledgerBefore = (await readResource(patB.rawToken, "flump://context/tax-ledger")).text;
    const budget = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "housing",
      name: "A secret rent",
      amount: 913.37,
    });
    expect(budget.status).toBe(201);
    const taxRecord = await h.call("post", "/tax-records", h.tokens.a, {
      type: "income",
      source: "rental",
      category: "rent",
      name: "A secret pay",
      amount: 7777.77,
      frequency: "one-off",
      date: "2025-06-01",
      receiptFilename: "a.pdf",
      receiptData: `data:application/pdf;base64,${Buffer.from("%PDF-1.4\nsecret receipt").toString("base64")}`,
    });
    expect(taxRecord.status).toBe(201);

    // Control: the data is reachable by its owner, so the absence below is meaningful. The tax
    // ledger only exposes aggregates, so A's record must change A's ledger and not B's.
    const budgetAsA = (await readResource(patA.rawToken, "flump://context/budget")).text;
    expect(budgetAsA).toContain("913.37");
    const ledgerAsA = (await readResource(patA.rawToken, "flump://context/tax-ledger")).text;
    expect(ledgerAsA).not.toEqual(ledgerBefore);
    expect((await readResource(patB.rawToken, "flump://context/tax-ledger")).text).toEqual(
      ledgerBefore,
    );

    for (const uri of [
      "flump://context/budget",
      "flump://context/tax-ledger",
      "flump://context/accounts",
      "flump://context/baseline",
      "flump://context/executive-snapshot",
    ]) {
      const res = await readResource(patB.rawToken, uri);
      expect(res.status, uri).toBe(200);
      for (const secret of ["913.37", "7777.77", "A secret", budget.body.id, taxRecord.body.id]) {
        expect(res.text, `${uri} leaks ${secret}`).not.toContain(secret);
      }
      // Receipt bytes never travel over MCP, even for the owner.
      expect((await readResource(patA.rawToken, uri)).text).not.toContain(
        Buffer.from("%PDF-1.4\nsecret receipt").toString("base64"),
      );
    }
  });

  it("A's revoked PAT is refused on a data read, and B revoking A's token does not revoke it", async () => {
    const read = (token: string) => readResource(token, "flump://context/accounts");

    const hostile = await h.call("delete", `/mcp-tokens/${patA.id}`, h.tokens.b);
    expect(hostile.status).toBe(404);
    expect((await read(patA.rawToken)).status).toBe(200);

    expect((await h.call("delete", `/mcp-tokens/${patA.id}`, h.tokens.a)).status).toBe(200);
    expect((await read(patA.rawToken)).status).toBe(401);
    // B's own PAT is unaffected by A's revocation.
    expect((await read(patB.rawToken)).status).toBe(200);
  });
});
