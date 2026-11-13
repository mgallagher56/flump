import "reflect-metadata";
import { inMemoryQueries } from "@flump/mcp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDataService } from "../../src/agent/agent-data.service";
import { McpToken } from "../../src/entities/mcp-token.entity";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import { type AuthzHarness, bootAuthzHarness, truncateAll, USER_A, USER_B } from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * /mcp transport authentication (E20-N22). The route has no AuthGuard by design: it accepts only
 * a personal access token (flump_pat_...). Both verbs must refuse everything else with 401, and a
 * PAT must only ever read its own owner's data, through every read tool (E17 re-plan PR B). The mcp-tokens management routes are authz.mcp-tokens.spec.ts (N23).
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

  const readResource = (token: string, uri: string) =>
    mcp("post", `Bearer ${token}`, {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/read",
      params: { uri },
    });

  /** Calls an MCP tool over HTTP and returns the parsed JSON body of its first text block. */
  const callTool = async (token: string, name: string, args: Record<string, unknown> = {}) => {
    const res = await mcp("post", `Bearer ${token}`, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name, arguments: args },
    });
    expect(res.status, name).toBe(200);
    // The transport answers as JSON or as one SSE event, depending on the client's Accept header.
    const raw = res.text.trim().startsWith("{")
      ? res.text
      : (res.text
          .split("\n")
          .find((l) => l.startsWith("data:"))
          ?.slice(5) ?? "{}");
    const rpc = JSON.parse(raw) as {
      result?: { content?: Array<{ text: string }>; isError?: boolean };
    };
    const text = rpc.result?.content?.[0]?.text ?? "";
    return { text, isError: rpc.result?.isError === true, body: JSON.parse(text || "{}") };
  };

  const READ_CALLS: Array<[string, Record<string, unknown>]> = [
    ["get_financial_snapshot", {}],
    ["get_financial_snapshot", { asOfMonth: "2025-06" }],
    ["get_balance_history", { from: "2024-01", to: "2025-12", groupBy: "account" }],
    ["get_data_coverage", {}],
    ["list_accounts", {}],
    ["get_budget_summary", { responseFormat: "detailed" }],
    ["get_debt_overview", {}],
    ["list_tax_records", { taxYear: "2025/26", responseFormat: "detailed" }],
    ["get_tax_year_position", { taxYear: "2025/26" }],
  ];

  const insertDetails = (
    accountId: string,
    userId: string,
    rows: Array<[number, number, number, string]>,
  ) =>
    h.dataSource.query(
      `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
       VALUES ${rows.map((_, i) => `($1, $2, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5}, make_date($${i * 4 + 3}, $${i * 4 + 4}, 1), $${i * 4 + 6})`).join(", ")}`,
      [accountId, userId, ...rows.flat()],
    );

  const createAccount = async (token: string, body: object) => {
    const res = await h.call("post", "/accounts", token, body);
    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  it("B's PAT cannot read A's data; A's PAT can", async () => {
    await createAccount(h.tokens.a, { name: "A Secret Saver", type: "Saving", balance: 1204.5 });

    const asA = await callTool(patA.rawToken, "list_accounts");
    // Names are anonymised for a PAT; the balance is not.
    expect(asA.text).toContain("1204.5");
    expect(asA.text).not.toContain("A Secret Saver");

    const asB = await callTool(patB.rawToken, "list_accounts");
    expect(asB.text).not.toContain("1204.5");
    expect(asB.body.result.accounts).toEqual([]);
  });

  it("B's PAT never returns A's budget, tax or history data; A's PAT does", async () => {
    const saver = await createAccount(h.tokens.a, {
      name: "A saver",
      type: "Saving",
      balance: 4321.09,
    });
    await insertDetails(saver, USER_A, [
      [2025, 1, 3101.11, "manual"],
      [2025, 6, 3606.66, "connected"],
    ]);
    const budget = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "housing",
      name: "A secret rent",
      amount: 913.37,
      notes: "A budget note",
    });
    expect(budget.status).toBe(201);
    const taxRecord = await h.call("post", "/tax-records", h.tokens.a, {
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "A secret pay",
      amount: 7777.77,
      frequency: "one-off",
      date: "2025-06-01",
      notes: "A secret note",
      receiptFilename: "a.pdf",
      receiptData: `data:application/pdf;base64,${Buffer.from("%PDF-1.4\nsecret receipt").toString("base64")}`,
    });
    expect(taxRecord.status).toBe(201);
    const receipt = Buffer.from("%PDF-1.4\nsecret receipt").toString("base64");

    // Control: the owner reaches the data, so the absence below is meaningful.
    expect((await callTool(patA.rawToken, "get_budget_summary")).text).toContain("913.37");
    const taxAsA = await callTool(patA.rawToken, "list_tax_records", { taxYear: "2025/26" });
    expect(taxAsA.body.result.totals.incomeGbp).toBe(7777.77);
    const histAsA = await callTool(patA.rawToken, "get_balance_history", {
      from: "2025-01",
      to: "2025-06",
      groupBy: "account",
    });
    expect(histAsA.text).toContain("3606.66");

    for (const [name, args] of READ_CALLS) {
      const asB = await callTool(patB.rawToken, name, args);
      expect(asB.isError, `${name} errored for B`).toBe(false);
      for (const secret of [
        "913.37",
        "7777.77",
        "4321.09",
        "3101.11",
        "3606.66",
        "A secret",
        saver,
        budget.body.id,
        taxRecord.body.id,
      ]) {
        expect(asB.text, `${name} leaks ${secret} to B`).not.toContain(secret);
      }
      // Receipts and tax-record notes never travel over MCP, even to the owner.
      const asA = await callTool(patA.rawToken, name, args);
      expect(asA.text, name).not.toContain(receipt);
      expect(asA.text, name).not.toContain("A secret note");
      expect(asA.text, name).not.toContain("A budget note");
      expect(asA.text, name).not.toContain(saver);
    }

    const schema = await readResource(patB.rawToken, "flump://schema");
    expect(schema.status).toBe(200);
    expect(schema.text).not.toContain("913.37");
  });

  it("B's token cannot name A's account in a history query, by uuid or by A's short id", async () => {
    const saver = await createAccount(h.tokens.a, { name: "A saver", type: "Saving", balance: 10 });
    await insertDetails(saver, USER_A, [[2025, 3, 555.55, "manual"]]);
    const aShortId = (await callTool(patA.rawToken, "list_accounts")).body.result.accounts[0].id;
    for (const id of [saver, aShortId]) {
      const asB = await callTool(patB.rawToken, "get_balance_history", {
        from: "2025-01",
        to: "2025-06",
        accountIds: [id],
      });
      expect(asB.isError).toBe(true);
      expect(asB.text).toContain("NOT_FOUND");
      expect(asB.text).not.toContain("555.55");
    }
  });

  describe("ranged provider queries (real Postgres)", () => {
    const provider = () => h.app.get(AgentDataService);

    it("getAccountSnapshots returns in-range rows plus one seed per account, for the caller only", async () => {
      const a1 = await createAccount(h.tokens.a, { name: "a1", type: "Saving", balance: 1 });
      const a2 = await createAccount(h.tokens.a, { name: "a2", type: "Credit Card", balance: 1 });
      const b1 = await createAccount(h.tokens.b, { name: "b1", type: "Saving", balance: 1 });
      await insertDetails(a1, USER_A, [
        [2024, 11, 100, "onboarding"],
        [2024, 12, 110, "manual"],
        [2025, 2, 120, "manual"],
        [2025, 5, 130, "connected"],
        [2025, 9, 140, "manual"],
      ]);
      await insertDetails(a2, USER_A, [[2025, 3, -50, "backfill"]]);
      await insertDetails(b1, USER_B, [[2025, 3, 999, "manual"]]);
      // A row mislabelled with A's user id but pointing at B's account must not come back for A.
      await h.dataSource.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, 2025, 4, 888, '2025-04-01', 'manual')`,
        [b1, USER_A],
      );

      const rows = await provider().getAccountSnapshots(USER_A, { from: "2025-01", to: "2025-06" });
      const key = (r: { accountId: string; year: number; month: number }) =>
        `${r.accountId === a1 ? "a1" : r.accountId === a2 ? "a2" : "other"}:${r.year}-${r.month}`;
      expect(rows.map(key).sort()).toEqual(
        ["a1:2024-12", "a1:2025-2", "a1:2025-5", "a2:2025-3"].sort(),
      );
      expect(rows.find((r) => r.accountId === a2)).toMatchObject({
        value: -50,
        source: "backfill",
      });

      const narrowed = await provider().getAccountSnapshots(USER_A, {
        from: "2025-01",
        to: "2025-06",
        accountIds: [a2, b1],
      });
      expect(narrowed.map((r) => r.accountId)).toEqual([a2]);
      expect(
        await provider().getAccountSnapshots(USER_B, {
          from: "2025-01",
          to: "2025-06",
          accountIds: [a1],
        }),
      ).toEqual([]);
      expect(
        await provider().getAccountSnapshots(USER_A, { from: "2025-06", to: "2025-01" }),
      ).toEqual([]);
    });

    it("getDataCoverage reports gaps and sources per owned account", async () => {
      const a1 = await createAccount(h.tokens.a, { name: "a1", type: "Saving", balance: 1 });
      await insertDetails(a1, USER_A, [
        [2024, 11, 100, "onboarding"],
        [2024, 12, 110, "manual"],
        [2025, 2, 120, "manual"],
        [2025, 9, 140, "connected"],
      ]);
      const b1 = await createAccount(h.tokens.b, { name: "b1", type: "Saving", balance: 1 });
      await insertDetails(b1, USER_B, [[2025, 3, 999, "manual"]]);
      // A row mislabelled with A's user id but pointing at B's account must not count for A.
      await h.dataSource.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, 2025, 5, 888, '2025-05-01', 'manual')`,
        [b1, USER_A],
      );

      expect(await provider().getDataCoverage(USER_A)).toEqual([
        {
          accountId: a1,
          firstMonth: "2024-11",
          lastMonth: "2025-09",
          recordedMonths: 4,
          gaps: [
            { from: "2025-01", to: "2025-01" },
            { from: "2025-03", to: "2025-08" },
          ],
          sources: ["connected", "manual", "onboarding"],
        },
      ]);
      const asB = await provider().getDataCoverage(USER_B);
      expect(asB.map((c) => c.accountId)).toEqual([b1]);
    });

    it("getTaxRecords matches the engine's month rule and never reads receipts or notes", async () => {
      const make = async (body: object) => {
        const res = await h.call("post", "/tax-records", h.tokens.a, {
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "r",
          amount: 100,
          notes: "private",
          ...body,
        });
        expect(res.status).toBe(201);
        return res.body.id as string;
      };
      const monthlyFromBefore = await make({ frequency: "monthly", date: "2024-10-01" });
      const monthlyEndedBefore = await make({
        frequency: "monthly",
        date: "2024-01-01",
        endDate: "2025-03-31",
      });
      const oneOffIn = await make({ frequency: "one-off", date: "2026-03-31" });
      const oneOffBefore = await make({ frequency: "one-off", date: "2025-03-31" });
      const annualIn = await make({ frequency: "annual", date: "2025-04-01" });
      const after = await make({ frequency: "monthly", date: "2026-04-01" });

      const rows = await provider().getTaxRecords(USER_A, {
        fromDate: "2025-04-01",
        toDate: "2026-03-31",
      });
      const ids = rows.map((r) => r.id).sort();
      expect(ids).toEqual([monthlyFromBefore, oneOffIn, annualIn].sort());
      for (const gone of [monthlyEndedBefore, oneOffBefore, after]) expect(ids).not.toContain(gone);
      for (const r of rows) {
        expect(
          Object.keys(r).filter((k) => k.startsWith("receipt") || k === "notes" || k === "userId"),
        ).toEqual([]);
      }
      expect(
        await provider().getTaxRecords(USER_B, { fromDate: "2025-04-01", toDate: "2026-03-31" }),
      ).toEqual([]);

      // Same answer as the in-memory provider used by stdio, including 1 to 5 April edges.
      const edgeMonthly = await make({
        frequency: "monthly",
        date: "2024-06-01",
        endDate: "2025-04-03",
      });
      const edgeOneOff = await make({ frequency: "one-off", date: "2025-04-03" });
      const range = { fromDate: "2025-04-01", toDate: "2026-03-31" };
      const fromDb = (await provider().getTaxRecords(USER_A, range)).map((r) => r.id).sort();
      const all = (await provider().getUserFinancialData(USER_A)).taxRecords ?? [];
      const memory = inMemoryQueries(async () => ({ baseline: {} as never, taxRecords: all }));
      const fromMemory = (await memory.getTaxRecords(USER_A, range)).map((r) => r.id).sort();
      expect(fromDb).toEqual(fromMemory);
      expect(fromDb).toEqual(expect.arrayContaining([edgeMonthly, edgeOneOff]));
    });
  });

  it("A's revoked PAT is refused on a data read, and B revoking A's token does not revoke it", async () => {
    const read = (token: string) =>
      mcp("post", `Bearer ${token}`, {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "list_accounts", arguments: {} },
      });

    const hostile = await h.call("delete", `/mcp-tokens/${patA.id}`, h.tokens.b);
    expect(hostile.status).toBe(404);
    expect((await read(patA.rawToken)).status).toBe(200);

    expect((await h.call("delete", `/mcp-tokens/${patA.id}`, h.tokens.a)).status).toBe(200);
    expect((await read(patA.rawToken)).status).toBe(401);
    // B's own PAT is unaffected by A's revocation.
    expect((await read(patB.rawToken)).status).toBe(200);
  });
});
