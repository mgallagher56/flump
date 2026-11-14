import "reflect-metadata";
import { MAX_TRANSACTION_PAGE } from "@flump/api-contract";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { claimVersion, expectedVersion } from "../../src/contract/etag";
import { Account } from "../../src/entities/account.entity";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
import { IdempotencyKey } from "../../src/entities/idempotency-key.entity";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import {
  type AuthzHarness,
  bootAuthzHarness,
  sansRequestId,
  truncateAll,
  USER_A,
} from "../authz/support";

// Migrations run on boot; see test/authz/support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("../authz/support.js")).withMigrations(await importOriginal()),
);

/**
 * BE-09 write conventions on the real AppModule and real Postgres: keyset pagination with the
 * X-Next-Cursor header (M-API1), Idempotency-Key on creates (M7) and If-Match / ETag on updates
 * (M7, L15). Every 2xx body is also checked against the contract by the harness.
 */
const dbMode = resolveDbTestMode(process.env);

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(dbMode === "skip")("write conventions (real Postgres)", () => {
  let h: AuthzHarness;
  const accounts = () => h.dataSource.getRepository(Account);
  const entries = () => h.dataSource.getRepository(BudgetEntry);
  const keys = () => h.dataSource.getRepository(IdempotencyKey);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
  });

  const createAccount = async (name: string, token = h.tokens.a) => {
    const res = await h.call("post", "/accounts", token, { name, type: "Saving", balance: 100 });
    expect(res.status).toBe(201);
    return res.body as { id: string; updatedAt: string };
  };

  /** Follows X-Next-Cursor from `path` until the last page; returns each page's ids. */
  const walk = async (path: string, limit: number): Promise<string[][]> => {
    const pages: string[][] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 20; i++) {
      const sep = path.includes("?") ? "&" : "?";
      const url = `${path}${sep}limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await h.call("get", url, h.tokens.a);
      expect(res.status, url).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      pages.push((res.body as { id: string | number }[]).map((r) => String(r.id)));
      cursor = res.headers["x-next-cursor"];
      if (!cursor) return pages;
    }
    throw new Error("pagination did not end");
  };

  describe("error envelope through the AppModule (M-API2)", () => {
    const REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

    it("answers an oversized body with 413 payload_too_large", async () => {
      // DEFAULT_JSON_LIMIT is 1mb; body-parser rejects before auth or the route runs.
      const res = await h
        .call("post", "/v1/accounts", h.tokens.a)
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ name: "x".repeat(1_100_000), type: "Saving", balance: 1 }));
      expect(res.status).toBe(413);
      expect(sansRequestId(res.body)).toEqual({
        code: "payload_too_large",
        message: "The request body is too large.",
      });
      expect(res.body.requestId).toMatch(REQUEST_ID);
      expect(await accounts().count()).toBe(0);
    });

    it("answers malformed JSON with a 400 envelope that does not echo the body", async () => {
      const res = await h
        .call("post", "/v1/accounts", h.tokens.a)
        .set("Content-Type", "application/json")
        .send('{"name": "secret-value",');
      expect(res.status).toBe(400);
      expect(sansRequestId(res.body)).toEqual({
        code: "invalid_json",
        message: "The request body is not valid JSON.",
      });
      expect(res.body.requestId).toMatch(REQUEST_ID);
      expect(JSON.stringify(res.body)).not.toContain("secret-value");
    });

    it("answers an unmatched route with a 404 envelope that hides the path", async () => {
      const res = await h.call("get", "/v1/no-such-route/abc", h.tokens.a);
      expect(res.status).toBe(404);
      expect(sansRequestId(res.body)).toEqual({ code: "not_found", message: "Not found" });
      expect(res.body.requestId).toMatch(REQUEST_ID);
    });
  });

  describe("pagination (M-API1)", () => {
    it("pages accounts oldest first with no row twice and no cursor on the last page", async () => {
      const ids: string[] = [];
      for (const name of ["one", "two", "three", "four", "five"]) {
        ids.push((await createAccount(name)).id);
      }
      await createAccount("B's", h.tokens.b);
      const pages = await walk("/accounts", 2);
      expect(pages.map((p) => p.length)).toEqual([2, 2, 1]);
      expect(pages.flat()).toEqual(ids);
      // The default page still returns everything a real user has (and only theirs).
      const all = await h.call("get", "/accounts", h.tokens.a);
      expect(all.headers["x-next-cursor"]).toBeUndefined();
      expect(all.body.map((a: { id: string }) => a.id)).toEqual(ids);
    });

    it("pages budget entries created in the same millisecond by the id tiebreak", async () => {
      // One INSERT: every row gets the same created_at, so only the id orders them.
      await entries().insert(
        Array.from({ length: 5 }, (_, i) => ({
          userId: USER_A,
          category: "bills",
          name: `Bill ${i}`,
          amount: 10 + i,
          frequency: "monthly",
          isIncome: false,
          isPrimaryIncome: false,
          isEssential: true,
          isDefault: false,
        })),
      );
      const pages = await walk("/budget-entries", 2);
      expect(pages.map((p) => p.length)).toEqual([2, 2, 1]);
      expect(new Set(pages.flat()).size).toBe(5);
      expect(pages.flat()).toEqual([...pages.flat()].sort());
    });

    it("orders two rows in the same millisecond by their microseconds, across pages", async () => {
      const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
      await entries().insert(
        ids.map((id, i) => ({
          id,
          userId: USER_A,
          category: "bills",
          name: `Bill ${i}`,
          amount: 10,
          frequency: "monthly",
          isIncome: false,
          isPrimaryIncome: false,
          isEssential: true,
          isDefault: false,
        })),
      );
      // The lower id is the later row, 800 microseconds apart inside one millisecond, so a
      // millisecond-truncated key would order (and page) them by id instead.
      await h.dataSource.query(
        `UPDATE budget_entries SET created_at = CASE id
           WHEN $1::uuid THEN '2026-01-01 10:00:00.000900'::timestamp
           ELSE '2026-01-01 10:00:00.000100'::timestamp END`,
        [ids[0]],
      );
      const pages = await walk("/budget-entries", 1);
      expect(pages).toEqual([[ids[1]], [ids[0]]]);
    });

    it("pages transactions newest first, narrowed to one account", async () => {
      const account = await createAccount("Current");
      const other = await createAccount("Other");
      const ids: string[] = [];
      for (const [i, accountId] of [account.id, account.id, other.id, account.id].entries()) {
        const res = await h.call("post", "/transactions", h.tokens.a, {
          accountId,
          amount: -i - 1,
          description: `t${i}`,
          category: "food",
          timestamp: `2026-11-0${i + 1}T10:00:00.000Z`,
        });
        expect(res.status).toBe(201);
        if (accountId === account.id) ids.push(res.body.id);
      }
      const pages = await walk(`/transactions?accountId=${account.id}`, 2);
      expect(pages.flat()).toEqual([...ids].reverse());
      expect(pages.map((p) => p.length)).toEqual([2, 1]);
    });

    it("pages tax records (date keys) and monthly values (integer keys)", async () => {
      for (const name of ["a", "b", "c"]) {
        const res = await h.call("post", "/tax-records", h.tokens.a, {
          type: "income",
          source: "paye",
          category: "salary",
          name,
          amount: 1000,
          frequency: "monthly",
          date: "2025-04-06",
        });
        expect(res.status).toBe(201);
      }
      const tax = await walk("/tax-records", 1);
      expect(tax.map((p) => p.length)).toEqual([1, 1, 1]);
      expect(new Set(tax.flat()).size).toBe(3);

      for (const name of ["x", "y"]) {
        const { id } = await createAccount(name);
        expect((await h.call("patch", `/accounts/${id}`, h.tokens.a, { balance: 5 })).status).toBe(
          200,
        );
      }
      const details = await walk("/account-details", 1);
      expect(details.map((p) => p.length)).toEqual([1, 1]);
      expect(new Set(details.flat()).size).toBe(2);
    });

    it("answers 400 validation_failed for a forged cursor or a limit over the maximum", async () => {
      const forged = Buffer.from(JSON.stringify(["x", "y"])).toString("base64url");
      for (const url of [
        `/accounts?cursor=${forged}`,
        "/accounts?cursor=not%20base64",
        `/transactions?limit=${MAX_TRANSACTION_PAGE + 1}`,
        "/budget-entries?limit=0",
      ]) {
        const res = await h.call("get", url, h.tokens.a);
        expect(res.status, url).toBe(400);
        expect(res.body.code, url).toBe("validation_failed");
      }
      for (const url of ["/bank-connections?limit=1", "/mcp-tokens?limit=1"]) {
        const res = await h.call("get", url, h.tokens.a);
        expect(res.status, url).toBe(200);
        expect(res.body).toEqual([]);
      }
    });
  });

  describe("Idempotency-Key (M7)", () => {
    const body = { name: "Rainy day", type: "Saving", balance: 250 };

    it("replays the first response for the same key and body, creating one row", async () => {
      const first = await h
        .call("post", "/accounts", h.tokens.a, body)
        .set("Idempotency-Key", "k-1");
      expect(first.status).toBe(201);
      expect(first.headers["idempotent-replayed"]).toBeUndefined();
      const again = await h
        .call("post", "/accounts", h.tokens.a, body)
        .set("Idempotency-Key", "k-1");
      expect(again.status).toBe(201);
      expect(again.headers["idempotent-replayed"]).toBe("true");
      expect(again.body).toEqual(first.body);
      expect(await accounts().countBy({ userId: USER_A })).toBe(1);
      expect(await keys().count()).toBe(1);
      // Another user's identical key is theirs alone.
      const other = await h
        .call("post", "/accounts", h.tokens.b, body)
        .set("Idempotency-Key", "k-1");
      expect(other.status).toBe(201);
      expect(other.body.id).not.toBe(first.body.id);
    });

    it("answers 422 idempotency_key_reused for the same key with a different body", async () => {
      await h.call("post", "/accounts", h.tokens.a, body).set("Idempotency-Key", "k-2");
      const res = await h
        .call("post", "/accounts", h.tokens.a, { ...body, balance: 999 })
        .set("Idempotency-Key", "k-2");
      expect(res.status).toBe(422);
      expect(sansRequestId(res.body)).toEqual({
        code: "idempotency_key_reused",
        message: "This Idempotency-Key was already used with a different request body.",
      });
      expect(await accounts().countBy({ userId: USER_A })).toBe(1);
    });

    it("creates once under concurrent duplicates; the others replay or get 409", async () => {
      const send = () =>
        h
          .call("post", "/budget-entries", h.tokens.a, {
            category: "bills",
            name: "Broadband",
            amount: 30,
          })
          .set("Idempotency-Key", "same-click");
      const results = await Promise.all(Array.from({ length: 6 }, send));
      expect(await entries().countBy({ userId: USER_A })).toBe(1);
      const created = results.filter((r) => r.status === 201);
      expect(created.length).toBeGreaterThanOrEqual(1);
      for (const r of results) expect([201, 409]).toContain(r.status);
      for (const r of results.filter((x) => x.status === 409)) expect(r.body.code).toBe("conflict");
      expect(new Set(created.map((r) => r.body.id)).size).toBe(1);
    });

    it("treats a key older than 24 hours as unused, and rejects a malformed key", async () => {
      await h.call("post", "/accounts", h.tokens.a, body).set("Idempotency-Key", "old");
      await h.dataSource.query(
        `UPDATE "idempotency_keys" SET "created_at" = now() - interval '25 hours'`,
      );
      const res = await h.call("post", "/accounts", h.tokens.a, body).set("Idempotency-Key", "old");
      expect(res.status).toBe(201);
      expect(res.headers["idempotent-replayed"]).toBeUndefined();
      expect(await accounts().countBy({ userId: USER_A })).toBe(2);

      const bad = await h
        .call("post", "/accounts", h.tokens.a, body)
        .set("Idempotency-Key", "x".repeat(256));
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe("validation_failed");
    });

    it("frees the key when the create fails, so a corrected retry goes through", async () => {
      const missing = "00000000-0000-4000-8000-000000000000";
      const tx = { accountId: missing, amount: -1, description: "x", category: "food" };
      const failed = await h
        .call("post", "/transactions", h.tokens.a, tx)
        .set("Idempotency-Key", "t");
      expect(failed.status).toBe(404);
      expect(await keys().count()).toBe(0);
    });
  });

  describe("If-Match / ETag (M7, L15)", () => {
    it("accounts: GET gives the ETag, a fresh If-Match updates, a stale one is 412", async () => {
      const { id } = await createAccount("Versioned");
      const read = await h.call("get", `/accounts/${id}`, h.tokens.a);
      const etag = read.headers.etag as string;
      expect(etag).toBe(`"${read.body.updatedAt}"`);
      expect(read.body).not.toHaveProperty("userId");
      expect(read.body).not.toHaveProperty("externalAccountId");

      await pause(5);
      const fresh = await h
        .call("patch", `/accounts/${id}`, h.tokens.a, { name: "Renamed" })
        .set("If-Match", etag);
      expect(fresh.status).toBe(200);
      expect(fresh.headers.etag).toBe(`"${fresh.body.updatedAt}"`);
      expect(fresh.headers.etag).not.toBe(etag);

      const stale = await h
        .call("patch", `/accounts/${id}`, h.tokens.a, { name: "Lost update" })
        .set("If-Match", etag);
      expect(stale.status).toBe(412);
      expect(stale.body.code).toBe("precondition_failed");
      expect((await accounts().findOneByOrFail({ id })).name).toBe("Renamed");

      // Without the header an update behaves as before.
      const blind = await h.call("patch", `/accounts/${id}`, h.tokens.a, { name: "Blind" });
      expect(blind.status).toBe(200);
      // Another user's If-Match on this account is the usual 404, never a 412.
      const foreign = await h
        .call("patch", `/accounts/${id}`, h.tokens.b, { name: "B" })
        .set("If-Match", blind.headers.etag as string);
      expect(foreign.status).toBe(404);
      // A value that is not one of ours can never match.
      const junk = await h
        .call("put", `/accounts/${id}`, h.tokens.a, { name: "Junk" })
        .set("If-Match", "*");
      expect(junk.status).toBe(412);
    });

    it("budget entries, tax records and the profile honour If-Match", async () => {
      const entry = await h.call("post", "/budget-entries", h.tokens.a, {
        category: "bills",
        name: "Water",
        amount: 20,
      });
      const tax = await h.call("post", "/tax-records", h.tokens.a, {
        type: "income",
        source: "paye",
        category: "salary",
        name: "Pay",
        amount: 1000,
        frequency: "monthly",
        date: "2025-04-06",
      });
      const profile = await h.call("get", "/user-profile", h.tokens.a);
      expect(profile.headers.etag).toBe(`"${profile.body.updatedAt}"`);
      const taxRead = await h.call("get", `/tax-records/${tax.body.id}`, h.tokens.a);
      expect(taxRead.headers.etag).toBe(`"${tax.body.updatedAt}"`);

      const cases = [
        {
          path: `/budget-entries/${entry.body.id}`,
          etag: `"${entry.body.updatedAt}"`,
          patch: { amount: 21 },
        },
        {
          path: `/tax-records/${tax.body.id}`,
          etag: taxRead.headers.etag as string,
          patch: { amount: 1001 },
        },
        {
          path: "/user-profile",
          etag: profile.headers.etag as string,
          patch: { displayName: "Ada" },
        },
      ];
      await pause(5);
      for (const { path, etag, patch } of cases) {
        const ok = await h.call("patch", path, h.tokens.a, patch).set("If-Match", etag);
        expect(ok.status, path).toBe(200);
        expect(ok.headers.etag, path).toBe(`"${ok.body.updatedAt}"`);
        expect(ok.headers.etag, path).not.toBe(etag);
        const stale = await h.call("patch", path, h.tokens.a, patch).set("If-Match", etag);
        expect(stale.status, path).toBe(412);
        expect(stale.body.code, path).toBe("precondition_failed");
      }
    });

    it("profile: a validation error after the claim rolls the claim back", async () => {
      const read = await h.call("get", "/user-profile", h.tokens.a);
      const etag = read.headers.etag as string;
      await pause(5);
      // 2099 passes the contract (max 2100) but not the service's "no later than this year".
      const bad = await h
        .call("patch", "/user-profile", h.tokens.a, { displayName: "Half", birthYear: 2099 })
        .set("If-Match", etag);
      expect(bad.status).toBe(400);
      const after = await h.call("get", "/user-profile", h.tokens.a);
      expect(after.headers.etag).toBe(etag);
      expect(after.body.displayName).toBe(read.body.displayName);
      const ok = await h
        .call("patch", "/user-profile", h.tokens.a, { displayName: "Whole" })
        .set("If-Match", etag);
      expect(ok.status).toBe(200);
    });

    it("compares and bumps the version in UTC whatever the session TimeZone", async () => {
      const { id } = await createAccount("Zoned");
      const etag = (await h.call("get", `/accounts/${id}`, h.tokens.a)).headers.etag as string;
      const expected = expectedVersion(etag) as Date;
      await pause(5);
      const before = Date.now();
      const claim = await h.dataSource.transaction(async (em) => {
        await em.query("SET LOCAL TimeZone = 'Pacific/Auckland'");
        return claimVersion(em.getRepository(Account), { id, user_id: USER_A }, expected);
      });
      expect(claim).toBe("updated");
      const bumped = (await h.call("get", `/accounts/${id}`, h.tokens.a)).body.updatedAt as string;
      // A bump written in Auckland wall-clock time would be about 13 hours ahead.
      expect(Math.abs(new Date(bumped).getTime() - before)).toBeLessThan(60_000);
      // And the old version no longer matches under a non-UTC session either.
      const again = await h.dataSource.transaction(async (em) => {
        await em.query("SET LOCAL TimeZone = 'America/Los_Angeles'");
        return claimVersion(em.getRepository(Account), { id, user_id: USER_A }, expected);
      });
      expect(again).toBe("stale");
      const current = await h.dataSource.transaction(async (em) => {
        await em.query("SET LOCAL TimeZone = 'America/Los_Angeles'");
        return claimVersion(em.getRepository(Account), { id, user_id: USER_A }, new Date(bumped));
      });
      expect(current).toBe("updated");
    });

    it("lets one of two concurrent updates with the same ETag win", async () => {
      const { id } = await createAccount("Race");
      const etag = (await h.call("get", `/accounts/${id}`, h.tokens.a)).headers.etag as string;
      await pause(5);
      const results = await Promise.all(
        ["Tab one", "Tab two"].map((name) =>
          h.call("patch", `/accounts/${id}`, h.tokens.a, { name }).set("If-Match", etag),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 412]);
      const winner = results.find((r) => r.status === 200);
      expect((await accounts().findOneByOrFail({ id })).name).toBe(winner?.body.name);
    });
  });
});
