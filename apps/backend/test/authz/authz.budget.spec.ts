import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
import { UserProfile } from "../../src/entities/user-profile.entity";
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
 * Budget controller IDOR matrix (E20-N22), real AppModule on real Postgres. Same cases as
 * authz.finance.spec.ts: A 2xx, B 404 identical to not-found with the row unchanged, 401 without a
 * valid token, write bodies probed with A's { id, userId }, lists free of A's rows.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: budget controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string) => exercised.add(key);

  let entryId: string;

  const entries = () => h.dataSource.getRepository(BudgetEntry);
  const profiles = () => h.dataSource.getRepository(UserProfile);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "budget")
      .map(([key]) => key)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
    const created = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "housing",
      name: "A rent",
      amount: 900,
    });
    expect(created.status).toBe(201);
    entryId = created.body.id;
  });

  const expectSameAsNotFound = async (method: "patch" | "delete", body?: object) => {
    const asB = await h.call(method, `/budget-entries/${entryId}`, h.tokens.b, body);
    const missing = await h.call(method, `/budget-entries/${MISSING_ID}`, h.tokens.b, body);
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asB.body).toEqual(missing.body);
  };

  const expectEntryUntouched = async () => {
    const row = await entries().findOneBy({ id: entryId });
    expect(row?.userId).toBe(USER_A);
    expect(row?.name).toBe("A rent");
    expect(Number(row?.amount)).toBe(900);
  };

  describe("authentication (every budget route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "patch" | "delete";
      path: () => string;
      body?: object;
    }> = [
      { key: "GET /budget-entries", method: "get", path: () => "/budget-entries" },
      {
        key: "POST /budget-entries/seed-defaults",
        method: "post",
        path: () => "/budget-entries/seed-defaults",
      },
      {
        key: "POST /budget-entries/categories",
        method: "post",
        path: () => "/budget-entries/categories",
        body: { category: "pets" },
      },
      {
        key: "POST /budget-entries",
        method: "post",
        path: () => "/budget-entries",
        body: { category: "housing", name: "x", amount: 1 },
      },
      {
        key: "PATCH /budget-entries/:id",
        method: "patch",
        path: () => `/budget-entries/${entryId}`,
        body: { name: "pwned" },
      },
      {
        key: "DELETE /budget-entries/:id",
        method: "delete",
        path: () => `/budget-entries/${entryId}`,
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
        await expectEntryUntouched();
        expect(await entries().count()).toBe(1);
        expect(await profiles().count()).toBe(0);
        ran(route.key);
      },
    );
  });

  it("GET /budget-entries: A sees own rows, B sees none of them", async () => {
    const a = await h.call("get", "/budget-entries", h.tokens.a);
    expect(a.status).toBe(200);
    expect(a.body.map((r: { id: string }) => r.id)).toEqual([entryId]);
    const b = await h.call("get", "/budget-entries", h.tokens.b);
    expect(b.status).toBe(200);
    expect(b.body).toEqual([]);
    ran("GET /budget-entries");
  });

  it("POST /budget-entries: A 201; a probe body from B cannot re-parent or overwrite A's row", async () => {
    const res = await h.call("post", "/budget-entries", h.tokens.b, {
      ...probeBody(entryId),
      category: "housing",
      name: "B rent",
      amount: 1,
    });
    expect(res.status).toBeLessThan(300);
    expect(res.body.userId).toBe(USER_B);
    expect(res.body.id).not.toBe(entryId);
    await expectEntryUntouched();
    expect(await entries().findBy({ userId: USER_A })).toHaveLength(1);
    ran("POST /budget-entries");
  });

  it("PATCH /budget-entries/:id: A 200, B 404 identical to not-found, row unchanged", async () => {
    const own = await h.call("patch", `/budget-entries/${entryId}`, h.tokens.a, { amount: 950 });
    expect(own.status).toBe(200);
    expect(own.body.amount).toBe(950);
    await entries().update({ id: entryId }, { amount: 900 });

    await expectSameAsNotFound("patch", { ...probeBody(entryId), name: "pwned", amount: 1 });
    await expectEntryUntouched();
    ran("PATCH /budget-entries/:id");
  });

  it("DELETE /budget-entries/:id: B 404 identical to not-found, row kept; A 200 removes it", async () => {
    await expectSameAsNotFound("delete");
    await expectEntryUntouched();

    const own = await h.call("delete", `/budget-entries/${entryId}`, h.tokens.a);
    expect(own.status).toBe(200);
    expect(await entries().findOneBy({ id: entryId })).toBeNull();
    ran("DELETE /budget-entries/:id");
  });

  it("POST /budget-entries/seed-defaults: seeds only the caller's own rows", async () => {
    const own = await h.call("post", "/budget-entries/seed-defaults", h.tokens.b);
    expect(own.status).toBeLessThan(300);
    expect(own.body.length).toBeGreaterThan(0);
    for (const row of own.body) {
      expect(row.userId).toBe(USER_B);
      expect(row.id).not.toBe(entryId);
    }
    await expectEntryUntouched();
    const a = await h.call("get", "/budget-entries", h.tokens.a);
    expect(a.body.map((r: { id: string }) => r.id)).toEqual([entryId]);
    ran("POST /budget-entries/seed-defaults");
  });

  it("POST /budget-entries/categories: custom categories are per user, probe body ignored", async () => {
    const aRes = await h.call("post", "/budget-entries/categories", h.tokens.a, {
      category: "Pets",
    });
    expect(aRes.status).toBeLessThan(300);
    expect(aRes.body.categories).toEqual(["pets"]);

    const bRes = await h.call("post", "/budget-entries/categories", h.tokens.b, {
      ...probeBody(entryId),
      category: "Holidays",
    });
    expect(bRes.status).toBeLessThan(300);
    expect(bRes.body.categories).toEqual(["holidays"]);

    expect((await profiles().findOneBy({ userId: USER_A }))?.customBudgetCategories).toEqual([
      "pets",
    ]);
    expect((await profiles().findOneBy({ userId: USER_B }))?.customBudgetCategories).toEqual([
      "holidays",
    ]);
    ran("POST /budget-entries/categories");
  });
  describe("/v1 alias (any case) gets the same answers as the unversioned path", () => {
    it.each(["/v1", "/V1"])(
      "%s: 401 without a valid token, A reaches own row, B gets the same 404",
      async (prefix) => {
        const paths: Array<["get" | "patch" | "delete", string, object | undefined]> = [
          ["get", `${prefix}/budget-entries`, undefined],
          ["patch", `${prefix}/budget-entries/${entryId}`, { name: "pwned" }],
          ["delete", `${prefix}/budget-entries/${entryId}`, undefined],
        ];
        for (const [method, path, body] of paths) {
          for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
            const res = await h.call(method, path, token, body);
            expect(res.status, `${method} ${path}`).toBe(401);
          }
        }
        await expectEntryUntouched();

        const own = await h.call("get", `${prefix}/budget-entries`, h.tokens.a);
        expect(own.status).toBe(200);
        expect(own.body).toHaveLength(1);
        const list = await h.call("get", `${prefix}/budget-entries`, h.tokens.b);
        expect(list.body).toEqual([]);
        const asB = await h.call("patch", `${prefix}/budget-entries/${entryId}`, h.tokens.b, {
          name: "pwned",
        });
        const missing = await h.call(
          "patch",
          `${prefix}/budget-entries/${MISSING_ID}`,
          h.tokens.b,
          { name: "pwned" },
        );
        expect(asB.status).toBe(404);
        expect(asB.body).toEqual(missing.body);
        const delB = await h.call("delete", `${prefix}/budget-entries/${entryId}`, h.tokens.b);
        expect(delB.status).toBe(404);
        expect(delB.body).toEqual(missing.body);
        await expectEntryUntouched();
      },
    );
  });
});
