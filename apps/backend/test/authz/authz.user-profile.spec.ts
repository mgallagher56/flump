import "reflect-metadata";
import { AccountExportDocument } from "@flump/api-contract";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
import { TaxRecord } from "../../src/entities/tax-record.entity";
import { UserProfile } from "../../src/entities/user-profile.entity";
import {
  USER_IDENTITY_ADAPTER,
  type WorkOSIdentityAdapter,
} from "../../src/identity/identity.adapter";
import { AccountDeletionService } from "../../src/privacy/account-deletion.service";
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
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);

  let profileAId: string;

  const profiles = () => h.dataSource.getRepository(UserProfile);
  const accounts = () => h.dataSource.getRepository(Account);
  const budget = () => h.dataSource.getRepository(BudgetEntry);
  const tax = () => h.dataSource.getRepository(TaxRecord);

  // The WorkOS adapter has no client in the test env, so its two reads/writes are replaced.
  const emails: Record<string, string> = { [USER_A]: "a@example.test", [USER_B]: "b@example.test" };
  const lookedUp: string[] = [];
  const resetSentTo: string[] = [];
  const deletedLogins: string[] = [];

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
    vi.spyOn(adapter, "deleteUser").mockImplementation(async (userId) => {
      deletedLogins.push(userId);
    });
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "user-profile")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    // Tombstones were truncated: drop the guard's cached "erased" answers with them.
    h.app.get(AccountDeletionService).clearErasedCache();
    await h.resetRateLimits();
    lookedUp.length = 0;
    resetSentTo.length = 0;
    deletedLogins.length = 0;
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
      method: "get" | "post" | "patch" | "delete";
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
      {
        key: "DELETE /user-profile",
        method: "delete",
        path: "/user-profile",
        body: { confirmation: "DELETE" },
      },
      { key: "GET /user-profile/export", method: "get", path: "/user-profile/export" },
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
        expect(deletedLogins).toEqual([]);
        ran(route.key, "authn");
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
      confirmation: "RESET",
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

  it("POST /user-profile/reset-financial-data: without the confirmation phrase is a 400 that wipes nothing", async () => {
    await seedFinancialData(h.tokens.b, "B");
    const res = await h.call("post", "/user-profile/reset-financial-data", h.tokens.b, {});
    expect(res.status).toBe(400);
    expect(await budget().countBy({ userId: USER_B })).toBeGreaterThan(0);
    expect(await tax().countBy({ userId: USER_B })).toBeGreaterThan(0);
  });

  const userIdRows = async (userId: string): Promise<number> => {
    const tables: { table_name: string }[] = await h.dataSource.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'user_id'`,
    );
    let total = 0;
    for (const { table_name } of tables) {
      const [{ n }] = await h.dataSource.query(
        `SELECT count(*)::int AS n FROM "${table_name}" WHERE user_id = $1`,
        [userId],
      );
      total += n;
    }
    return total;
  };

  it("DELETE /user-profile: B's deletion (probe body) erases only B, and B gets no new profile after", async () => {
    await seedFinancialData(h.tokens.a, "A");
    await seedFinancialData(h.tokens.b, "B");
    const aRows = await userIdRows(USER_A);

    const res = await h.call("delete", "/user-profile", h.tokens.b, {
      ...probeBody(profileAId),
      confirmation: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "deleted" });
    expect(deletedLogins).toEqual([USER_B]);
    expect(await userIdRows(USER_B)).toBe(0);
    expect(await userIdRows(USER_A)).toBe(aRows);
    await expectProfileAUntouched();

    // B's access token is still valid until it expires: no profile row may be recreated from it.
    // 410 account_deleted (not 401, which would loop the web app through sign-in).
    const after = await h.call("get", "/user-profile", h.tokens.b);
    expect(after.status).toBe(410);
    expect(after.body).toMatchObject({
      error: "account_deleted",
      message: "This account has been deleted.",
    });
    expect(await profiles().countBy({ userId: USER_B })).toBe(0);
    // Every other route refuses the erased account too: no write can recreate its data.
    const writes = [
      await h.call("post", "/accounts", h.tokens.b, { name: "x", type: "Saving", balance: 1 }),
      await h.call("post", "/budget-entries", h.tokens.b, {
        category: "housing",
        name: "x",
        amount: 1,
      }),
      await h.call("post", "/mcp-tokens", h.tokens.b, { name: "x" }),
      await h.call("patch", "/user-profile/checklist", h.tokens.b, { step: "x", completed: true }),
    ];
    expect(writes.map((r) => r.status)).toEqual([410, 410, 410, 410]);
    expect(await userIdRows(USER_B)).toBe(0);
    // The deletion route stays open, so a retry still works (idempotent).
    const retry = await h.call("delete", "/user-profile", h.tokens.b, { confirmation: "DELETE" });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ status: "deleted" });
    ran("DELETE /user-profile");
  });

  it("DELETE /user-profile: a wrong phrase is a 400 and a stale sign-in a 403; neither deletes anything", async () => {
    await seedFinancialData(h.tokens.b, "B");
    const before = await userIdRows(USER_B);
    for (const body of [{}, { confirmation: "delete" }, { confirmation: "RESET" }]) {
      const res = await h.call("delete", "/user-profile", h.tokens.b, body);
      expect(res.status).toBe(400);
    }
    const stale = await h.call("delete", "/user-profile", h.tokens.stale, {
      confirmation: "DELETE",
    });
    expect(stale.status).toBe(403);
    expect(stale.body.error).toBe("recent_login_required");
    expect(await userIdRows(USER_B)).toBe(before);
    expect(deletedLogins).toEqual([]);
  });

  it("POST /user-profile/reset-financial-data: a stale sign-in is a 403 that wipes nothing", async () => {
    await seedFinancialData(h.tokens.b, "B");
    const res = await h.call("post", "/user-profile/reset-financial-data", h.tokens.stale, {
      confirmation: "RESET",
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("recent_login_required");
    expect(await budget().countBy({ userId: USER_B })).toBeGreaterThan(0);
  });

  it("GET /user-profile/export: each caller downloads only their own data, as an uncached attachment", async () => {
    await seedFinancialData(h.tokens.a, "A");
    await seedFinancialData(h.tokens.b, "B");

    const res = await h.call("get", "/user-profile/export", h.tokens.b).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="flump-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    const text = res.text;
    const doc = AccountExportDocument.parse(JSON.parse(text));
    expect(doc.userId).toBe(USER_B);
    expect(doc.accounts.map((a) => a.name)).toEqual(["B saver"]);
    expect(doc.budgetEntries.map((b) => b.name)).toEqual(["B rent"]);
    expect(doc.taxRecords.map((t) => t.name)).toEqual(["B pay"]);
    expect(text).not.toContain(USER_A);
    expect(text).not.toContain("A Secret Name");
    expect(text).not.toContain("A saver");
    ran("GET /user-profile/export");
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
