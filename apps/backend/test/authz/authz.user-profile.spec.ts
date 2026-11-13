import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
import { TaxRecord } from "../../src/entities/tax-record.entity";
import { UserProfile } from "../../src/entities/user-profile.entity";
import {
  USER_IDENTITY_ADAPTER,
  type WorkOSIdentityAdapter,
} from "../../src/identity/identity.adapter";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
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
 * User-profile controller IDOR matrix (E20-N23), real AppModule on real Postgres.
 *
 * Every route here acts on the caller's own profile (the user id comes from the token, there is
 * no id in the path), so the cross-user cases are: B's call, with a body carrying A's { id,
 * userId }, changes only B's data; B's reset wipes only B's data; and the password reset targets
 * the caller's own address, never one named in the body. No token or an expired one gets 401.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: user-profile controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string) => exercised.add(key);

  let profileAId: string;

  const profiles = () => h.dataSource.getRepository(UserProfile);
  const accounts = () => h.dataSource.getRepository(Account);
  const budget = () => h.dataSource.getRepository(BudgetEntry);
  const tax = () => h.dataSource.getRepository(TaxRecord);

  // The WorkOS adapter has no client in the test env, so its two reads/writes are replaced.
  const emails: Record<string, string> = { [USER_A]: "a@example.test", [USER_B]: "b@example.test" };
  const lookedUp: string[] = [];
  const resetSentTo: string[] = [];

  beforeAll(async () => {
    h = await bootAuthzHarness();
    const adapter = h.app.get<WorkOSIdentityAdapter>(USER_IDENTITY_ADAPTER);
    vi.spyOn(adapter, "getUserEmail").mockImplementation(async (userId) => {
      lookedUp.push(userId);
      return emails[userId] ?? null;
    });
    vi.spyOn(adapter, "sendPasswordReset").mockImplementation(async (email) => {
      resetSentTo.push(email);
    });
    vi.spyOn(adapter, "updateName").mockImplementation(async () => undefined);
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "user-profile")
      .map(([key]) => key)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
    lookedUp.length = 0;
    resetSentTo.length = 0;
    const patched = await h.call("patch", "/user-profile", h.tokens.a, {
      displayName: "A Secret Name",
      annualSalary: 50000,
    });
    expect(patched.status).toBe(200);
    profileAId = (await profiles().findOneByOrFail({ userId: USER_A })).id;
  });

  const seedFinancialData = async (token: string, label: string) => {
    expect(
      (
        await h.call("post", "/accounts", token, {
          name: `${label} saver`,
          type: "Saving",
          balance: 10,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await h.call("post", "/budget-entries", token, {
          category: "housing",
          name: `${label} rent`,
          amount: 5,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await h.call("post", "/tax-records", token, {
          type: "income",
          source: "paye",
          category: "salary",
          name: `${label} pay`,
          amount: 5,
          frequency: "one-off",
          date: "2025-04-06",
        })
      ).status,
    ).toBe(201);
  };

  const expectProfileAUntouched = async () => {
    const row = await profiles().findOneByOrFail({ userId: USER_A });
    expect(row.id).toBe(profileAId);
    expect(row.displayName).toBe("A Secret Name");
    expect(Number(row.annualSalary)).toBe(50000);
    expect(row.hasResetFinancialData).toBeFalsy();
  };

  describe("authentication (every user-profile route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "patch";
      path: string;
      body?: object;
    }> = [
      { key: "GET /user-profile", method: "get", path: "/user-profile" },
      {
        key: "PATCH /user-profile",
        method: "patch",
        path: "/user-profile",
        body: { displayName: "pwned" },
      },
      {
        key: "POST /user-profile/send-password-reset",
        method: "post",
        path: "/user-profile/send-password-reset",
      },
      {
        key: "POST /user-profile/reset-financial-data",
        method: "post",
        path: "/user-profile/reset-financial-data",
      },
      {
        key: "PATCH /user-profile/checklist",
        method: "patch",
        path: "/user-profile/checklist",
        body: { step: "pwned", completed: true },
      },
    ];

    it.each(routes.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401, data unchanged",
      async (_key, route) => {
        await seedFinancialData(h.tokens.a, "A");
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path, token, route.body);
          expect(
            res.status,
            `${route.key} with ${token === undefined ? "no" : token === h.tokens.dev ? "dev-bypass" : "expired"} token`,
          ).toBe(401);
        }
        await expectProfileAUntouched();
        expect(await profiles().count()).toBe(1);
        expect(await accounts().countBy({ userId: USER_A })).toBe(1);
        expect(await budget().countBy({ userId: USER_A })).toBe(1);
        expect(await tax().countBy({ userId: USER_A })).toBe(1);
        expect(lookedUp).toEqual([]);
        expect(resetSentTo).toEqual([]);
        ran(route.key);
      },
    );
  });

  it("GET /user-profile: each caller gets only their own profile", async () => {
    const a = await h.call("get", "/user-profile", h.tokens.a);
    expect(a.status).toBe(200);
    expect(a.body.displayName).toBe("A Secret Name");
    expect(a.body.annualSalary).toBe(50000);

    const b = await h.call("get", "/user-profile", h.tokens.b);
    expect(b.status).toBe(200);
    expect(b.body.userId).toBe(USER_B);
    expect(b.body.id).not.toBe(profileAId);
    expect(b.body.displayName).toBeNull();
    expect(b.body.annualSalary).toBeNull();
    expect(b.text).not.toContain("A Secret Name");
    await expectProfileAUntouched();
    ran("GET /user-profile");
  });

  it("PATCH /user-profile: B's probe body (A's id and userId) only ever edits B's own row", async () => {
    const res = await h.call("patch", "/user-profile", h.tokens.b, {
      ...probeBody(profileAId),
      displayName: "B Name",
      annualSalary: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(USER_B);
    expect(res.body.id).not.toBe(profileAId);
    await expectProfileAUntouched();
    const b = await profiles().findOneByOrFail({ userId: USER_B });
    expect(b.displayName).toBe("B Name");
    expect(await profiles().count()).toBe(2);
    ran("PATCH /user-profile");
  });

  it("PATCH /user-profile/checklist: steps are per user, probe body ignored", async () => {
    const a = await h.call("patch", "/user-profile/checklist", h.tokens.a, {
      step: "connect-bank",
      completed: true,
    });
    expect(a.status).toBe(200);

    const b = await h.call("patch", "/user-profile/checklist", h.tokens.b, {
      ...probeBody(profileAId),
      step: "add-budget",
      completed: true,
    });
    expect(b.status).toBe(200);
    expect(b.body.setupChecklistCompletedSteps).toEqual(["add-budget"]);

    expect(
      (await profiles().findOneByOrFail({ userId: USER_A })).setupChecklistCompletedSteps,
    ).toEqual(["connect-bank"]);
    await expectProfileAUntouched();
    ran("PATCH /user-profile/checklist");
  });

  it("POST /user-profile/reset-financial-data: B's reset wipes only B's data", async () => {
    await seedFinancialData(h.tokens.a, "A");
    await seedFinancialData(h.tokens.b, "B");

    const res = await h.call("post", "/user-profile/reset-financial-data", h.tokens.b, {
      ...probeBody(profileAId),
    });
    expect(res.status).toBeLessThan(300);
    expect(res.body.profile.userId).toBe(USER_B);

    expect(await accounts().countBy({ userId: USER_B })).toBe(0);
    expect(await budget().countBy({ userId: USER_B })).toBe(0);
    expect(await tax().countBy({ userId: USER_B })).toBe(0);

    expect(await accounts().countBy({ userId: USER_A })).toBe(1);
    expect(await budget().countBy({ userId: USER_A })).toBe(1);
    expect(await tax().countBy({ userId: USER_A })).toBe(1);
    await expectProfileAUntouched();
    ran("POST /user-profile/reset-financial-data");
  });

  it("POST /user-profile/send-password-reset: resolves the caller's own address, body ignored", async () => {
    const res = await h.call("post", "/user-profile/send-password-reset", h.tokens.b, {
      email: emails[USER_A],
      userId: USER_A,
    });
    expect(res.status).toBeLessThan(300);
    expect(lookedUp).toEqual([USER_B]);
    expect(resetSentTo).toEqual([emails[USER_B]]);
    expect(resetSentTo).not.toContain(emails[USER_A]);
    ran("POST /user-profile/send-password-reset");
  });
});
