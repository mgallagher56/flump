import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentAuditService } from "../../src/agent/agent-audit.service";
import { Account } from "../../src/entities/account.entity";
import { AccountDetail } from "../../src/entities/account-detail.entity";
import { AgentAuditEvent } from "../../src/entities/agent-audit-event.entity";
import { ImportBatch } from "../../src/entities/import-batch.entity";
import { writeConnectedSnapshot } from "../../src/snapshots/connected-write";
import { londonDate, londonYearMonth, monthKey } from "../../src/snapshots/london-date";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import { type AuthzHarness, bootAuthzHarness, MISSING_ID, truncateAll, USER_A } from "./support";

vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Import pipeline (E17 re-plan PR C), real AppModule on real Postgres: stage touches nothing live,
 * commit is one transaction with the E30 upsert, revert restores only rows the batch still owns,
 * and another user's batch is the same 404 as a missing one.
 */
const dbMode = resolveDbTestMode(process.env);
const THIS_MONTH = monthKey(londonYearMonth());
const FUTURE = "2999-01";

/** `n` consecutive months from January 2000. */
const months = (n: number): string[] =>
  Array.from({ length: n }, (_, i) =>
    monthKey({ year: 2000 + Math.floor(i / 12), month: (i % 12) + 1 }),
  );

let keySeq = 0;
const key = () => `test-key-${++keySeq}-${Date.now()}`;

describe.skipIf(dbMode === "skip")("authz: imports controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  let accountA: string;
  let accountB: string;

  const details = () => h.dataSource.getRepository(AccountDetail);
  const accounts = () => h.dataSource.getRepository(Account);
  const batches = () => h.dataSource.getRepository(ImportBatch);
  const rowFor = (accountId: string, month: string) => {
    const [year, mm] = month.split("-").map(Number);
    return details().findOneBy({ accountId, year, month: mm });
  };

  const stage = (token: string | undefined, body: object) => {
    exercised.add("POST /imports");
    return h.call("post", "/imports", token, body);
  };
  const getBatch = (token: string | undefined, id: string) => {
    exercised.add("GET /imports/:id");
    return h.call("get", `/imports/${id}`, token);
  };
  const commit = (token: string | undefined, id: string, body: object = {}) => {
    exercised.add("POST /imports/:id/commit");
    return h.call("post", `/imports/${id}/commit`, token, body);
  };
  const revert = (token: string | undefined, id: string) => {
    exercised.add("POST /imports/:id/revert");
    return h.call("post", `/imports/${id}/revert`, token, {});
  };

  const simple = (overrides: object = {}) => ({
    idempotencyKey: key(),
    accounts: [{ ref: "isa", name: "Secret ISA name", type: "Saving" }],
    balances: [
      { accountRef: "isa", month: "2020-01", value: 1000 },
      { accountRef: "isa", month: "2020-02", value: 1100 },
    ],
    ...overrides,
  });

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "imports")
      .map(([k]) => k)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
    const create = async (token: string, name: string, balance: number) => {
      const res = await h.call("post", "/accounts", token, { name, type: "Saving", balance });
      expect(res.status).toBe(201);
      return res.body.id as string;
    };
    accountA = await create(h.tokens.a, "A Saver", 100);
    accountB = await create(h.tokens.b, "B Saver", 900);
    await details().clear();
  });

  it("no, expired and dev-bypass tokens get 401 on every route and nothing is stored", async () => {
    for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
      expect((await stage(token, simple())).status).toBe(401);
      expect((await getBatch(token, MISSING_ID)).status).toBe(401);
      expect((await commit(token, MISSING_ID)).status).toBe(401);
      expect((await revert(token, MISSING_ID)).status).toBe(401);
    }
    expect(await batches().count()).toBe(0);
  });

  it("stage stores the batch, touches nothing live, and returns refs and counts, never names", async () => {
    const res = await stage(h.tokens.a, simple());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "staged",
      counts: { new: 2, overwrite: 0, unchanged: 0, errors: 0 },
      rows: 3,
      validationErrors: [],
      revert: null,
      committedAt: null,
    });
    expect(JSON.stringify(res.body)).not.toContain("Secret ISA name");
    expect(await accounts().count()).toBe(2);
    expect(await details().count()).toBe(0);
    const stored = await batches().findOneByOrFail({ id: res.body.batchId });
    expect(stored.userId).toBe(USER_A);
    const ttl = stored.expiresAt.getTime() - stored.createdAt.getTime();
    expect(Math.round(ttl / 86_400_000)).toBe(7);
  });

  it("drops future and pre-2000 months and unknown refs per row, with refs and codes only", async () => {
    const res = await stage(
      h.tokens.a,
      simple({
        balances: [
          { accountRef: "isa", month: "2020-01", value: 1 },
          { accountRef: "isa", month: FUTURE, value: 2 },
          { accountRef: "isa", month: "1999-12", value: 3 },
          { accountRef: "nope", month: "2020-01", value: 4 },
        ],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.counts).toEqual({ new: 1, overwrite: 0, unchanged: 0, errors: 3 });
    expect(res.body.validationErrors).toEqual([
      { ref: "isa", month: FUTURE, code: "future_month" },
      { ref: "isa", month: "1999-12", code: "too_early" },
      { ref: "nope", month: "2020-01", code: "unknown_account_ref" },
    ]);
  });

  it("replays the same idempotency key to the same batch, and appends chunks by batchId", async () => {
    const first = simple();
    const a = await stage(h.tokens.a, first);
    const again = await stage(h.tokens.a, first);
    expect(again.status).toBe(201);
    expect(again.body.batchId).toBe(a.body.batchId);
    expect(await batches().count()).toBe(1);

    const chunk = {
      batchId: a.body.batchId,
      idempotencyKey: key(),
      accounts: [],
      balances: [{ accountRef: "isa", month: "2020-03", value: 1200 }],
    };
    const appended = await stage(h.tokens.a, chunk);
    expect(appended.body).toMatchObject({ batchId: a.body.batchId, rows: 4 });
    const replayed = await stage(h.tokens.a, chunk);
    expect(replayed.body).toMatchObject({ batchId: a.body.batchId, rows: 4 });
    expect(await batches().count()).toBe(1);
  });

  it("another user's batch is the same 404 as a missing one on every route", async () => {
    const a = await stage(h.tokens.a, simple());
    const id = a.body.batchId as string;
    const pairs = [
      [await getBatch(h.tokens.b, id), await getBatch(h.tokens.b, MISSING_ID)],
      [await commit(h.tokens.b, id), await commit(h.tokens.b, MISSING_ID)],
      [await revert(h.tokens.b, id), await revert(h.tokens.b, MISSING_ID)],
      [
        await stage(h.tokens.b, simple({ batchId: id })),
        await stage(h.tokens.b, simple({ batchId: MISSING_ID })),
      ],
    ];
    for (const [foreign, missing] of pairs) {
      expect(foreign.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(foreign.body).toEqual(missing.body);
    }
    expect((await batches().findOneByOrFail({ id })).status).toBe("staged");
    expect(await details().count()).toBe(0);
  });

  it("commit cannot map a ref to another user's account: 404, nothing written", async () => {
    const a = await stage(h.tokens.a, simple());
    const res = await commit(h.tokens.a, a.body.batchId, { accountMap: { isa: accountB } });
    expect(res.status).toBe(404);
    expect(await details().count()).toBe(0);
    expect(await accounts().count()).toBe(2);
    expect((await batches().findOneByOrFail({ id: a.body.batchId })).status).toBe("staged");
  });

  it("caps a batch at 5,000 rows across chunks; the over-cap chunk stores nothing", async () => {
    const refs = Array.from({ length: 20 }, (_, i) => `acc${i}`);
    const ms = months(250);
    const rowsOf = (some: string[]) =>
      some.flatMap((ref) => ms.map((month) => ({ accountRef: ref, month, value: 1 })));
    const first = await stage(h.tokens.a, {
      idempotencyKey: key(),
      accounts: refs.map((ref) => ({ ref, name: ref, type: "Saving" })),
      balances: rowsOf(refs.slice(0, 10)),
    });
    expect(first.status).toBe(201);
    expect(first.body.rows).toBe(2520);
    const over = await stage(h.tokens.a, {
      batchId: first.body.batchId,
      idempotencyKey: key(),
      accounts: [],
      balances: rowsOf(refs.slice(10)),
    });
    expect(over.status).toBe(400);
    expect((await getBatch(h.tokens.a, first.body.batchId)).body.rows).toBe(2520);
  });

  it("allows at most 3 open batches per user", async () => {
    for (let i = 0; i < 3; i++) expect((await stage(h.tokens.a, simple())).status).toBe(201);
    const fourth = await stage(h.tokens.a, simple());
    expect(fourth.status).toBe(409);
    expect((await stage(h.tokens.b, simple())).status).toBe(201);
  });

  it("limits staging to 30 calls an hour per user", async () => {
    const body = simple();
    for (let i = 0; i < 30; i++) expect((await stage(h.tokens.a, body)).status).toBe(201);
    expect((await stage(h.tokens.a, body)).status).toBe(429);
    expect((await stage(h.tokens.b, simple())).status).toBe(201);
  });

  it("commit creates or maps accounts and writes source agent rows stamped with the batch", async () => {
    const res = await stage(h.tokens.a, {
      idempotencyKey: key(),
      accounts: [
        { ref: "isa", name: "New ISA", type: "Saving", details: { interestRate: 4.5 } },
        { ref: "card", name: "Card", type: "Credit Card" },
        { ref: "mine", name: "Existing", type: "Saving" },
      ],
      balances: [
        { accountRef: "isa", month: "2020-01", value: 500 },
        { accountRef: "card", month: "2020-01", value: 300 },
        { accountRef: "mine", month: THIS_MONTH, value: 4321 },
      ],
    });
    const id = res.body.batchId as string;
    const done = await commit(h.tokens.a, id, { accountMap: { mine: accountA, isa: null } });
    expect(done.status).toBe(201);
    expect(done.body).toMatchObject({
      status: "committed",
      counts: { new: 3, overwrite: 0, unchanged: 0, errors: 0 },
    });
    const isa = await accounts().findOneByOrFail({ name: "New ISA", userId: USER_A });
    expect(Number(isa.interestRate)).toBe(4.5);
    const card = await accounts().findOneByOrFail({ name: "Card", userId: USER_A });
    expect(Number(card.balance)).toBe(-300);
    expect(await rowFor(card.id, "2020-01")).toMatchObject({ source: "agent", importBatchId: id });
    expect(Number((await rowFor(card.id, "2020-01"))?.value)).toBe(-300);
    expect(await rowFor(accountA, THIS_MONTH)).toMatchObject({
      source: "agent",
      importBatchId: id,
    });
    expect(Number((await accounts().findOneByOrFail({ id: accountA })).balance)).toBe(4321);
    // Committed once only.
    expect((await commit(h.tokens.a, id)).status).toBe(409);
  });

  it("skips rows that would overwrite a manual value unless ticked, and counts unchanged rows", async () => {
    await h.call("put", "/snapshots/2020-01", h.tokens.a, {
      values: [{ accountId: accountA, value: 50 }],
    });
    await h.call("put", "/snapshots/2020-02", h.tokens.a, {
      values: [{ accountId: accountA, value: 1100 }],
    });
    const first = await stage(h.tokens.a, simple());
    const res = await commit(h.tokens.a, first.body.batchId, { accountMap: { isa: accountA } });
    expect(res.body).toMatchObject({
      counts: { new: 0, overwrite: 0, unchanged: 1, errors: 0 },
      skippedManual: ["isa:2020-01"],
    });
    expect(await rowFor(accountA, "2020-01")).toMatchObject({
      source: "manual",
      importBatchId: null,
    });
    expect(Number((await rowFor(accountA, "2020-01"))?.value)).toBe(50);

    const second = await stage(h.tokens.a, simple());
    const ticked = await commit(h.tokens.a, second.body.batchId, {
      accountMap: { isa: accountA },
      overwriteManual: ["isa:2020-01"],
    });
    expect(ticked.body).toMatchObject({ counts: { overwrite: 1 }, skippedManual: [] });
    expect(await rowFor(accountA, "2020-01")).toMatchObject({
      source: "agent",
      importBatchId: second.body.batchId,
    });
  });

  it("commit is atomic: a failure mid-commit leaves no accounts, rows or status change", async () => {
    await h.dataSource.query(
      `CREATE OR REPLACE FUNCTION fail_import_test() RETURNS trigger AS $$
       BEGIN IF NEW."value" = 424242.42 THEN RAISE EXCEPTION 'boom'; END IF; RETURN NEW; END;
       $$ LANGUAGE plpgsql`,
    );
    await h.dataSource.query(
      `CREATE TRIGGER fail_import_test BEFORE INSERT ON "account_details"
       FOR EACH ROW EXECUTE FUNCTION fail_import_test()`,
    );
    try {
      const res = await stage(
        h.tokens.a,
        simple({
          accounts: [
            { ref: "new1", name: "New 1", type: "Saving" },
            { ref: "isa", name: "ISA", type: "Saving" },
          ],
          balances: [
            { accountRef: "new1", month: "2020-01", value: 1 },
            { accountRef: "isa", month: "2020-01", value: 424242.42 },
          ],
        }),
      );
      const failed = await commit(h.tokens.a, res.body.batchId, { accountMap: { isa: accountA } });
      expect(failed.status).toBe(500);
      expect(await accounts().count()).toBe(2);
      expect(await details().count()).toBe(0);
      expect((await batches().findOneByOrFail({ id: res.body.batchId })).status).toBe("staged");
    } finally {
      await h.dataSource.query(`DROP TRIGGER IF EXISTS fail_import_test ON "account_details"`);
      await h.dataSource.query("DROP FUNCTION IF EXISTS fail_import_test()");
    }
  });

  it("revert restores only rows the batch still owns and leaves later edits alone", async () => {
    await h.call("put", "/snapshots/2020-01", h.tokens.a, {
      values: [{ accountId: accountA, value: 50 }],
    });
    const res = await stage(h.tokens.a, {
      idempotencyKey: key(),
      accounts: [
        { ref: "isa", name: "ISA", type: "Saving" },
        { ref: "fresh", name: "Fresh", type: "Saving" },
        { ref: "kept", name: "Kept", type: "Saving" },
      ],
      balances: [
        { accountRef: "isa", month: "2020-01", value: 1000 },
        { accountRef: "isa", month: "2020-02", value: 1100 },
        { accountRef: "isa", month: "2020-03", value: 1200 },
        { accountRef: "fresh", month: "2020-01", value: 7 },
        { accountRef: "kept", month: "2020-01", value: 8 },
      ],
    });
    const id = res.body.batchId as string;
    await commit(h.tokens.a, id, {
      accountMap: { isa: accountA },
      overwriteManual: ["isa:2020-01"],
    });
    const kept = await accounts().findOneByOrFail({ name: "Kept", userId: USER_A });

    // Edited after the commit: no longer the batch's.
    await h.call("put", "/snapshots/2020-03", h.tokens.a, {
      values: [{ accountId: accountA, value: 999 }],
    });
    await h.call("put", "/snapshots/2020-01", h.tokens.a, {
      values: [{ accountId: kept.id, value: 9 }],
    });

    const undone = await revert(h.tokens.a, id);
    expect(undone.status).toBe(201);
    expect(undone.body).toMatchObject({
      status: "reverted",
      revert: { restored: 1, removed: 2, kept: 2 },
    });
    expect(await rowFor(accountA, "2020-01")).toMatchObject({
      source: "manual",
      importBatchId: null,
    });
    expect(Number((await rowFor(accountA, "2020-01"))?.value)).toBe(50);
    expect(await rowFor(accountA, "2020-02")).toBeNull();
    expect(Number((await rowFor(accountA, "2020-03"))?.value)).toBe(999);
    // The created account with nothing left is removed; the one the user edited stays.
    expect(await accounts().findOneBy({ name: "Fresh", userId: USER_A })).toBeNull();
    expect(Number((await rowFor(kept.id, "2020-01"))?.value)).toBe(9);
    expect((await revert(h.tokens.a, id)).status).toBe(409);
    expect((await getBatch(h.tokens.a, id)).body.status).toBe("reverted");
  });

  it("expires staged batches after 7 days: status expired, no commit, no append, cap freed", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await stage(h.tokens.a, simple())).body.batchId);
    await h.dataSource.query(
      `UPDATE "import_batches" SET "expires_at" = '2000-01-01' WHERE "id" = $1`,
      [ids[0]],
    );
    expect((await getBatch(h.tokens.a, ids[0] as string)).body.status).toBe("expired");
    expect((await commit(h.tokens.a, ids[0] as string)).status).toBe(409);
    expect((await stage(h.tokens.a, simple({ batchId: ids[0] }))).status).toBe(409);
    expect((await stage(h.tokens.a, simple())).status).toBe(201);
    expect(await details().count()).toBe(0);
  });

  it("agent rows are sticky against bank sync", async () => {
    const res = await stage(h.tokens.a, {
      idempotencyKey: key(),
      accounts: [{ ref: "isa", name: "ISA", type: "Saving" }],
      balances: [{ accountRef: "isa", month: THIS_MONTH, value: 777 }],
    });
    await commit(h.tokens.a, res.body.batchId, { accountMap: { isa: accountA } });
    const { year, month } = londonYearMonth();
    const wrote = await writeConnectedSnapshot(details(), accounts(), {
      accountId: accountA,
      userId: USER_A,
      year,
      month,
      value: 5,
      asOfDate: londonDate(),
    });
    expect(wrote).toBe(false);
    expect(await rowFor(accountA, THIS_MONTH)).toMatchObject({ source: "agent" });
    expect(Number((await rowFor(accountA, THIS_MONTH))?.value)).toBe(777);
    expect(Number((await accounts().findOneByOrFail({ id: accountA })).balance)).toBe(777);
  });

  it("reset financial data removes the user's import batches", async () => {
    await stage(h.tokens.a, simple());
    await stage(h.tokens.b, simple());
    const res = await h.call("post", "/user-profile/reset-financial-data", h.tokens.a);
    expect(res.status).toBe(201);
    expect(await batches().countBy({ userId: USER_A })).toBe(0);
    expect(await batches().count()).toBe(1);
  });

  it("agent audit: records identifiers and an HMAC only, and purges rows older than 13 months", async () => {
    const audit = h.app.get(AgentAuditService);
    const events = h.dataSource.getRepository(AgentAuditEvent);
    await events.clear();
    await audit.record({
      userId: USER_A,
      tokenId: MISSING_ID,
      clientName: "Claude Desktop <script>",
      toolName: "get_balance_history",
      scopesUsed: ["mcp:read:full", "Robert Smith 1234.56"],
      outcome: "ok",
      latencyMs: 12.4,
      responseBytes: 2048,
      args: { accountIds: ["x"], amount: 1234.56, note: "Robert Smith" },
    });
    const [row] = await h.dataSource.query(`SELECT * FROM "agent_audit_events"`);
    const flat = JSON.stringify(row);
    expect(flat).not.toContain("1234.56");
    expect(flat).not.toContain("Robert");
    expect(row).toMatchObject({
      user_id: USER_A,
      tool_name: "get_balance_history",
      client_name: "Claude Desktop script",
      scopes_used: "mcp:read:full",
      latency_ms: 12,
      response_bytes: 2048,
    });

    await h.dataSource.query(
      `UPDATE "agent_audit_events" SET "created_at" = now() - interval '14 months'`,
    );
    await audit.record({
      userId: USER_A,
      toolName: "list_accounts",
      outcome: "error",
      errorCode: "E1",
      latencyMs: 1,
      responseBytes: 0,
    });
    expect(await audit.purgeOlderThan13Months()).toBe(1);
    expect(await events.count()).toBe(1);
  });
});
