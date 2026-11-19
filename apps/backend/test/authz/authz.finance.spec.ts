import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { BankConnection } from "../../src/entities/bank-connection.entity";
import { Transaction } from "../../src/entities/transaction.entity";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  expectProbeRejected,
  MISSING_ID,
  probeBody,
  sansRequestId,
  truncateAll,
  USER_A,
  USER_B,
} from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Finance controller IDOR matrix (E20-N22), real AppModule on real Postgres.
 *
 * Per route: A gets 2xx on own data; B gets 404 with the same body as a genuine not-found and the
 * row unchanged (checked by direct query); no token or an expired token gets 401; write bodies
 * carry { id, userId } of A's row; lists never contain A's rows.
 *
 * Run: see test/authz/support.ts. Skipped when TEST_DATABASE_URL is unset unless REQUIRE_DB_TESTS=1.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: finance controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string) => exercised.add(key);

  let accountId: string;
  let connectionId: string;

  const accounts = () => h.dataSource.getRepository(Account);
  const connections = () => h.dataSource.getRepository(BankConnection);
  const transactions = () => h.dataSource.getRepository(Transaction);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    // The spec may only claim the routes the matrix assigns to it, and must have run all of them.
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "finance")
      .map(([key]) => key)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Saver",
      type: "Saving",
      balance: 1204.5,
    });
    expect(created.status).toBe(201);
    accountId = created.body.id;
    const tx = await h.call("post", "/transactions", h.tokens.a, {
      accountId,
      amount: -12.34,
      description: "A coffee",
      category: "food",
    });
    expect(tx.status).toBe(201);
    const connection = await connections().save(
      connections().create({
        userId: USER_A,
        institutionId: "monzo",
        institutionName: "A Bank",
        status: "connected",
        authType: "token",
        accessToken: null,
        refreshToken: null,
      }),
    );
    connectionId = connection.id;
  });

  /** B's answer must be indistinguishable from asking for a row that does not exist. */
  const expectSameAsNotFound = async (
    method: "get" | "post" | "put" | "patch" | "delete",
    realPath: string,
    missingPath: string,
    body?: object,
  ) => {
    const asB = await h.call(method, realPath, h.tokens.b, body);
    const missing = await h.call(method, missingPath, h.tokens.b, body);
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(sansRequestId(asB.body)).toEqual(sansRequestId(missing.body));
  };

  const expectAccountUntouched = async () => {
    const row = await accounts().findOneBy({ id: accountId });
    expect(row?.userId).toBe(USER_A);
    expect(row?.name).toBe("A Saver");
    expect(Number(row?.balance)).toBe(1204.5);
  };

  const expectConnectionUntouched = async () => {
    const row = await connections().findOneBy({ id: connectionId });
    expect(row?.userId).toBe(USER_A);
    expect(row?.institutionName).toBe("A Bank");
    expect(row?.status).toBe("connected");
  };

  describe("authentication (every finance route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "put" | "patch" | "delete";
      path: () => string;
      body?: object;
    }> = [
      { key: "GET /accounts", method: "get", path: () => "/accounts" },
      { key: "GET /account-details", method: "get", path: () => "/account-details" },
      { key: "GET /accounts/:id", method: "get", path: () => `/accounts/${accountId}` },
      {
        key: "GET /accounts/:id/details",
        method: "get",
        path: () => `/accounts/${accountId}/details`,
      },
      {
        key: "POST /accounts",
        method: "post",
        path: () => "/accounts",
        body: { name: "x", type: "Saving", balance: 1 },
      },
      {
        key: "POST /accounts/mortgage-with-property",
        method: "post",
        path: () => "/accounts/mortgage-with-property",
        body: { mortgage: { name: "x", balance: 1 }, property: { balance: 2 } },
      },
      {
        key: "PATCH /accounts/:id",
        method: "patch",
        path: () => `/accounts/${accountId}`,
        body: { name: "pwned" },
      },
      { key: "DELETE /accounts/:id", method: "delete", path: () => `/accounts/${accountId}` },
      { key: "GET /transactions", method: "get", path: () => "/transactions" },
      {
        key: "POST /transactions",
        method: "post",
        path: () => "/transactions",
        body: { accountId: MISSING_ID, amount: 1, description: "x", category: "x" },
      },
      { key: "GET /bank-connections", method: "get", path: () => "/bank-connections" },
      {
        key: "GET /bank-connections/capability",
        method: "get",
        path: () => "/bank-connections/capability",
      },
      {
        key: "POST /bank-connections",
        method: "post",
        path: () => "/bank-connections",
        body: { institutionId: "monzo" },
      },
      {
        key: "POST /bank-connections/:id/refresh",
        method: "post",
        path: () => `/bank-connections/${connectionId}/refresh`,
      },
      {
        key: "DELETE /bank-connections/:id",
        method: "delete",
        path: () => `/bank-connections/${connectionId}`,
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
        await expectAccountUntouched();
        await expectConnectionUntouched();
        expect(await accounts().count()).toBe(1);
        expect(await connections().count()).toBe(1);
        expect(await transactions().count()).toBe(1);
        ran(route.key);
      },
    );
  });

  describe("lists never return A's rows to B", () => {
    it("GET /accounts, /account-details, /transactions, /bank-connections", async () => {
      const a = await h.call("get", "/accounts", h.tokens.a);
      expect(a.status).toBe(200);
      expect(a.body.map((r: { id: string }) => r.id)).toEqual([accountId]);
      const aTx = await h.call("get", "/transactions", h.tokens.a);
      expect(aTx.status).toBe(200);
      expect(aTx.body).toHaveLength(1);
      const aConnections = await h.call("get", "/bank-connections", h.tokens.a);
      expect(aConnections.status).toBe(200);
      expect(aConnections.body).toHaveLength(1);
      const aDetails = await h.call("get", "/account-details", h.tokens.a);
      expect(aDetails.status).toBe(200);

      const b = await h.call("get", "/accounts", h.tokens.b);
      expect(b.status).toBe(200);
      expect(b.body).toEqual([]);
      for (const path of [
        "/transactions",
        "/bank-connections",
        "/account-details",
        `/transactions?accountId=${accountId}`,
      ]) {
        const res = await h.call("get", path, h.tokens.b);
        expect(res.status, path).toBe(200);
        expect(res.body, path).toEqual([]);
      }

      const capability = await h.call("get", "/bank-connections/capability", h.tokens.b);
      expect(capability.status).toBe(200);

      for (const key of [
        "GET /accounts",
        "GET /account-details",
        "GET /transactions",
        "GET /bank-connections",
        "GET /bank-connections/capability",
      ]) {
        ran(key);
      }
    });
  });

  describe("single-row reads", () => {
    it("GET /accounts?details=: none, the newest month, or every month (default), own rows only", async () => {
      // Two past months beside the row creating the account recorded (decision 8 option A).
      for (const [year, month, value] of [
        [2024, 6, 1100],
        [2024, 1, 1000],
      ] as const) {
        await h.dataSource.query(
          `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
           VALUES ($1, $2, $3, $4, $5, make_date($3, $4, 1), 'manual')`,
          [accountId, USER_A, year, month, value],
        );
      }
      const months = (body: Array<{ details: Array<{ year: number; month: number }> }>) =>
        body.map((a) => a.details.map((d) => `${d.year}-${d.month}`));

      const all = await h.call("get", "/accounts", h.tokens.a);
      expect(all.status).toBe(200);
      const every = months(all.body)[0] ?? [];
      expect(every.slice(0, 2)).toEqual(["2024-1", "2024-6"]);
      expect(every.length).toBeGreaterThanOrEqual(2);
      const newest = every[every.length - 1];

      const explicitAll = await h.call("get", "/accounts?details=all", h.tokens.a);
      expect(explicitAll.body).toEqual(all.body);

      const latest = await h.call("get", "/accounts?details=latest", h.tokens.a);
      expect(latest.status).toBe(200);
      expect(months(latest.body)).toEqual([[newest]]);
      // The newest month is the same row in both answers, every field.
      expect(latest.body[0].details[0]).toEqual(all.body[0].details[every.length - 1]);

      const none = await h.call("get", "/accounts?details=none", h.tokens.a);
      expect(none.status).toBe(200);
      expect(months(none.body)).toEqual([[]]);
      // Only the history changes: every other field is the same.
      expect({ ...none.body[0], details: undefined }).toEqual({
        ...all.body[0],
        details: undefined,
      });

      const bad = await h.call("get", "/accounts?details=some", h.tokens.a);
      expect(bad.status).toBe(400);

      for (const details of ["none", "latest", "all"]) {
        const b = await h.call("get", `/accounts?details=${details}`, h.tokens.b);
        expect(b.status, details).toBe(200);
        expect(b.body, details).toEqual([]);
      }
    });

    it("GET /accounts/:id: A 200, B 404 identical to not-found", async () => {
      const a = await h.call("get", `/accounts/${accountId}`, h.tokens.a);
      expect(a.status).toBe(200);
      expect(a.body.id).toBe(accountId);
      await expectSameAsNotFound("get", `/accounts/${accountId}`, `/accounts/${MISSING_ID}`);
      ran("GET /accounts/:id");
    });

    it("GET /accounts/:id/details: A 200, B 404 identical to not-found", async () => {
      const a = await h.call("get", `/accounts/${accountId}/details`, h.tokens.a);
      expect(a.status).toBe(200);
      await expectSameAsNotFound(
        "get",
        `/accounts/${accountId}/details`,
        `/accounts/${MISSING_ID}/details`,
      );
      ran("GET /accounts/:id/details");
    });
  });

  describe("account writes", () => {
    it("POST /accounts: A 201; a probe body from B cannot re-parent or overwrite A's row", async () => {
      const own = await h.call("post", "/accounts", h.tokens.a, {
        name: "A second",
        type: "Current",
        balance: 5,
      });
      expect(own.status).toBe(201);

      const bCreate = await h.call("post", "/accounts", h.tokens.b, {
        ...probeBody(accountId),
        name: "B account",
        type: "Current",
        balance: 7,
      });
      expectProbeRejected(bCreate);
      await expectAccountUntouched();
      const bRows = await accounts().findBy({ userId: USER_B });
      for (const row of bRows) expect(row.id).not.toBe(accountId);
      expect(await accounts().findBy({ userId: USER_A })).toHaveLength(2);
      ran("POST /accounts");
    });

    it.each(["patch"] as const)(
      "%s /accounts/:id: A 200, B 404 identical to not-found, row unchanged",
      async (verb) => {
        const key = `${verb.toUpperCase()} /accounts/:id`;
        const own = await h.call(verb, `/accounts/${accountId}`, h.tokens.a, { balance: 99 });
        expect(own.status).toBe(200);
        expect(Number(own.body.balance)).toBe(99);
        await accounts().update({ id: accountId }, { balance: 1204.5 });

        const probe = { ...probeBody(accountId), name: "pwned", balance: 1 };
        expectProbeRejected(await h.call(verb, `/accounts/${accountId}`, h.tokens.b, probe));
        const body = { name: "pwned", balance: 1 };
        await expectSameAsNotFound(verb, `/accounts/${accountId}`, `/accounts/${MISSING_ID}`, body);
        await expectAccountUntouched();
        ran(key);
      },
    );

    it("POST /accounts/mortgage-with-property: A 201 linked pair; B cannot re-parent it or link A's property", async () => {
      const own = await h.call("post", "/accounts/mortgage-with-property", h.tokens.a, {
        mortgage: { name: "A mortgage", balance: 186000 },
        property: { balance: 310000 },
      });
      expect(own.status).toBe(201);
      expect(own.body.mortgage.linkedAccountId).toBe(own.body.property.id);
      for (const id of [own.body.mortgage.id, own.body.property.id]) {
        expect((await accounts().findOneBy({ id }))?.userId).toBe(USER_A);
      }

      const probe = await h.call("post", "/accounts/mortgage-with-property", h.tokens.b, {
        mortgage: { ...probeBody(accountId), name: "B mortgage", balance: 1 },
        property: { balance: 2 },
      });
      // The strict body refuses the smuggled ids, nested under `mortgage`.
      expect(probe.status).toBe(400);
      const paths = (probe.body.issues as Array<{ path: string }>).map((i) => i.path).sort();
      expect(paths).toEqual(["body.mortgage.id", "body.mortgage.userId"]);
      await expectAccountUntouched();

      // The pair route takes no account id at all: naming A's property (or A's mortgage) as the
      // link is refused, so B cannot attach a new mortgage to A's home.
      for (const id of [own.body.property.id, own.body.mortgage.id]) {
        const named = await h.call("post", "/accounts/mortgage-with-property", h.tokens.b, {
          mortgage: { name: "B mortgage", balance: 1, linkedAccountId: id },
          property: { balance: 2 },
        });
        expect(named.status).toBe(400);
      }
      expect(await accounts().findBy({ userId: USER_B })).toHaveLength(0);
      expect(await accounts().findBy({ linkedAccountId: own.body.property.id })).toHaveLength(1);

      // B's own mortgage may not point at A's property: the same 400 as an unknown id.
      const bMortgage = await h.call("post", "/accounts", h.tokens.b, {
        name: "B mortgage",
        type: "Mortgage",
        balance: 1000,
      });
      expect(bMortgage.status).toBe(201);
      const linkA = await h.call("patch", `/accounts/${bMortgage.body.id}`, h.tokens.b, {
        linkedAccountId: own.body.property.id,
      });
      const linkMissing = await h.call("patch", `/accounts/${bMortgage.body.id}`, h.tokens.b, {
        linkedAccountId: MISSING_ID,
      });
      expect(linkA.status).toBe(400);
      expect(sansRequestId(linkA.body)).toEqual(sansRequestId(linkMissing.body));
      expect((await accounts().findOneBy({ id: bMortgage.body.id }))?.linkedAccountId).toBeNull();
      ran("POST /accounts/mortgage-with-property");
    });

    it("DELETE /accounts/:id: B 404 identical to not-found, row kept; A 200 removes it", async () => {
      await expectSameAsNotFound("delete", `/accounts/${accountId}`, `/accounts/${MISSING_ID}`);
      await expectAccountUntouched();
      expect(await transactions().count()).toBe(1);

      const own = await h.call("delete", `/accounts/${accountId}`, h.tokens.a);
      expect(own.status).toBeLessThan(300);
      expect(await accounts().findOneBy({ id: accountId })).toBeNull();
      ran("DELETE /accounts/:id");
    });
  });

  describe("transactions", () => {
    it("POST /transactions: A 201; B posting to A's account gets 404 identical to not-found", async () => {
      const own = await h.call("post", "/transactions", h.tokens.a, {
        accountId,
        amount: -1,
        description: "A again",
        category: "food",
      });
      expect(own.status).toBe(201);
      expect(own.body.userId).toBe(USER_A);

      const before = await transactions().count();
      expectProbeRejected(
        await h.call("post", "/transactions", h.tokens.b, {
          ...probeBody(accountId),
          accountId,
          amount: 5000,
          description: "injected",
          category: "x",
        }),
      );
      const body = (id: string) => ({
        accountId: id,
        amount: 5000,
        description: "injected",
        category: "x",
      });
      const asB = await h.call("post", "/transactions", h.tokens.b, body(accountId));
      const missing = await h.call("post", "/transactions", h.tokens.b, body(MISSING_ID));
      expect(asB.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(sansRequestId(asB.body)).toEqual(sansRequestId(missing.body));
      expect(await transactions().count()).toBe(before);
      expect(await transactions().findBy({ userId: USER_B })).toEqual([]);
      ran("POST /transactions");
    });
  });

  describe("bank connections", () => {
    it("POST /bank-connections: a probe body from B cannot touch A's connection", async () => {
      const res = await h.call("post", "/bank-connections", h.tokens.b, {
        ...probeBody(connectionId),
        institutionId: "monzo",
      });
      // The provider call fails or is rejected; what matters is that A's row is untouched and
      // nothing was created under A or with A's id.
      expect(res.status).not.toBe(401);
      await expectConnectionUntouched();
      expect(await connections().findBy({ userId: USER_A })).toHaveLength(1);
      for (const row of await connections().findBy({ userId: USER_B })) {
        expect(row.id).not.toBe(connectionId);
      }
      ran("POST /bank-connections");
    });

    it.each(["refresh"] as const)(
      "POST /bank-connections/:id/%s: A reaches own row, B gets 404 identical to not-found",
      async (action) => {
        const own = await h.call("post", `/bank-connections/${connectionId}/${action}`, h.tokens.a);
        // A's connection has no credentials, so the service answers 400 (not 404): A reached it.
        expect(own.status).not.toBe(404);
        expect(own.status).not.toBe(401);
        await expectSameAsNotFound(
          "post",
          `/bank-connections/${connectionId}/${action}`,
          `/bank-connections/${MISSING_ID}/${action}`,
        );
        const row = await connections().findOneBy({ id: connectionId });
        expect(row?.userId).toBe(USER_A);
        expect(row?.accessToken).toBeNull();
        ran(`POST /bank-connections/:id/${action}`);
      },
    );

    it("the deprecated aliases are gone (BE-16, L11): /sync and PUT /accounts/:id are plain 404s", async () => {
      const sync = await h.call("post", `/bank-connections/${connectionId}/sync`, h.tokens.a);
      expect(sync.status).toBe(404);
      const put = await h.call("put", `/accounts/${accountId}`, h.tokens.a, { name: "x" });
      expect(put.status).toBe(404);
      // PATCH /accounts/balances was removed by system audit slice 4: it is no longer a route.
      const balances = await h.call("patch", "/accounts/balances", h.tokens.a, {
        balances: [{ id: accountId, balance: 1 }],
      });
      expect(balances.status).toBeGreaterThanOrEqual(400);
      await expectAccountUntouched();
      await expectConnectionUntouched();
    });

    it("DELETE /bank-connections/:id: B 404 identical to not-found, row kept; A 200 removes it", async () => {
      await expectSameAsNotFound(
        "delete",
        `/bank-connections/${connectionId}`,
        `/bank-connections/${MISSING_ID}`,
      );
      await expectConnectionUntouched();

      const own = await h.call("delete", `/bank-connections/${connectionId}`, h.tokens.a);
      expect(own.status).toBe(200);
      expect(await connections().findOneBy({ id: connectionId })).toBeNull();
      ran("DELETE /bank-connections/:id");
    });
  });

  describe("/v1 alias (any case) gets the same answers as the unversioned path", () => {
    const prefixes = ["/v1", "/V1"];

    it.each(prefixes)(
      "%s: 401 without a valid token, A reaches own row, B gets the same 404",
      async (prefix) => {
        const paths: Array<["get" | "patch" | "delete", string, object | undefined]> = [
          ["get", `${prefix}/accounts`, undefined],
          ["get", `${prefix}/accounts/${accountId}`, undefined],
          ["patch", `${prefix}/accounts/${accountId}`, { name: "pwned" }],
          ["delete", `${prefix}/accounts/${accountId}`, undefined],
          ["delete", `${prefix}/bank-connections/${connectionId}`, undefined],
        ];
        for (const [method, path, body] of paths) {
          for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
            const res = await h.call(method, path, token, body);
            expect(res.status, `${method} ${path}`).toBe(401);
          }
        }
        await expectAccountUntouched();
        await expectConnectionUntouched();

        const own = await h.call("get", `${prefix}/accounts/${accountId}`, h.tokens.a);
        expect(own.status).toBe(200);
        const list = await h.call("get", `${prefix}/accounts`, h.tokens.b);
        expect(list.body).toEqual([]);
        await expectSameAsNotFound(
          "get",
          `${prefix}/accounts/${accountId}`,
          `${prefix}/accounts/${MISSING_ID}`,
        );
        await expectSameAsNotFound(
          "patch",
          `${prefix}/accounts/${accountId}`,
          `${prefix}/accounts/${MISSING_ID}`,
          { name: "pwned" },
        );
        await expectSameAsNotFound(
          "delete",
          `${prefix}/accounts/${accountId}`,
          `${prefix}/accounts/${MISSING_ID}`,
        );
        await expectSameAsNotFound(
          "delete",
          `${prefix}/bank-connections/${connectionId}`,
          `${prefix}/bank-connections/${MISSING_ID}`,
        );
        await expectAccountUntouched();
        await expectConnectionUntouched();
      },
    );
  });

  it("uses distinct users (sanity)", () => {
    expect(USER_A).not.toBe(USER_B);
  });
});
