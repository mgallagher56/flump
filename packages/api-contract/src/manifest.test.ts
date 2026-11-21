import { describe, expect, it } from "vitest";
import { allRoutes, CONTRACT_GROUPS, findRoute, NON_JSON_RESPONSE_ROUTES } from "./manifest.js";
import { checkAgainst } from "./validate.js";

describe("route manifest", () => {
  it("has 82 routes (64 before the 15 invoicing and 3 account-goal routes) with unique ids and unique method+path pairs", () => {
    expect(allRoutes).toHaveLength(82);
    expect(new Set(allRoutes.map((r) => r.id)).size).toBe(allRoutes.length);
    expect(new Set(allRoutes.map((r) => `${r.method} ${r.path}`)).size).toBe(allRoutes.length);
  });

  it("has no transactions routes (system audit slice 9: only the deleted mobile app called them)", () => {
    expect(allRoutes.filter((r) => r.id.startsWith("transactions."))).toEqual([]);
    expect(allRoutes.filter((r) => r.path === "transactions")).toEqual([]);
  });

  it("only uses declared groups and resolves alias targets", () => {
    const ids = new Set(allRoutes.map((r) => r.id));
    for (const route of allRoutes) {
      expect(CONTRACT_GROUPS).toContain(route.group);
      if (route.aliasOf) expect(ids.has(route.aliasOf)).toBe(true);
    }
  });

  it("every body-carrying mutation declares a body schema (shrink-only exceptions)", () => {
    const bodyless = allRoutes
      .filter((r) => ["POST", "PATCH", "PUT"].includes(r.method) && !r.body)
      .map((r) => r.id)
      .sort();
    expect(bodyless).toEqual(["bankConnections.refresh", "mcp.post", "profile.sendPasswordReset"]);
  });

  it("every route declares a response schema, except the non-JSON ones (E21)", () => {
    const missing = allRoutes
      .filter((r) => !r.response)
      .map((r) => r.id)
      .sort();
    expect(missing).toEqual([...NON_JSON_RESPONSE_ROUTES].sort());
    for (const id of NON_JSON_RESPONSE_ROUTES) {
      expect(allRoutes.find((r) => r.id === id)?.response).toBeUndefined();
    }
  });

  it("findRoute matches on method and path template", () => {
    expect(findRoute("PATCH", "user-profile")?.id).toBe("profile.update");
    expect(findRoute("GET", "nope")).toBeUndefined();
  });
});

describe("request schemas", () => {
  const body = (id: string) => allRoutes.find((r) => r.id === id)?.body as never;

  it("accepts a typical budget create and reports the deprecated alias as valid", () => {
    expect(
      checkAgainst(body("budget.create"), { category: "living", title: "Rent", amount: 900 }).ok,
    ).toBe(true);
  });

  it("flags unknown keys, wrong types and nulls on NOT NULL account fields", () => {
    const result = checkAgainst(body("accounts.update"), {
      name: null,
      balance: "12",
      userId: "x",
    });
    expect(result).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "name", code: "invalid_type" }),
        expect.objectContaining({ path: "balance", code: "invalid_type" }),
        { path: "userId", code: "unrecognized_keys", message: "Unknown field" },
      ]),
    });
  });

  it("accepts a mortgage with its property and refuses a link, a type or a property at £0", () => {
    const pair = body("accounts.createMortgageWithProperty");
    const ok = { mortgage: { name: "Mortgage", balance: 186000 }, property: { balance: 310000 } };
    expect(checkAgainst(pair, ok).ok).toBe(true);
    expect(checkAgainst(pair, { ...ok, property: { balance: 0 } }).ok).toBe(false);
    expect(checkAgainst(pair, { ...ok, mortgage: { ...ok.mortgage, type: "Mortgage" } }).ok).toBe(
      false,
    );
    expect(
      checkAgainst(pair, {
        ...ok,
        mortgage: { ...ok.mortgage, linkedAccountId: "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11" },
      }).ok,
    ).toBe(false);
    expect(checkAgainst(body("accounts.update"), { repaymentType: "part-and-part" }).ok).toBe(
      false,
    );
    expect(checkAgainst(body("accounts.update"), { accountSubtype: "rental" }).ok).toBe(true);
  });

  it("validates mortgage term fields", () => {
    const create = { name: "Home", type: "Mortgage", balance: -200000 };
    expect(
      checkAgainst(body("accounts.create"), {
        ...create,
        termMonths: 300,
        fixedRateEndDate: "2028-03-31",
      }).ok,
    ).toBe(true);
    expect(checkAgainst(body("accounts.create"), { ...create, termMonths: 0 }).ok).toBe(false);
    expect(checkAgainst(body("accounts.update"), { termMonths: 2.5 }).ok).toBe(false);
    expect(checkAgainst(body("accounts.update"), { fixedRateEndDate: "2028-02-30" }).ok).toBe(
      false,
    );
    expect(checkAgainst(body("accounts.update"), { termMonths: null }).ok).toBe(true);
  });

  it("never puts values in issues", () => {
    const result = checkAgainst(body("accounts.create"), { name: "secret-name", balance: 1.005 });
    expect(JSON.stringify(result)).not.toContain("secret-name");
  });

  it("rejects a never-expiring PAT and an over-long name", () => {
    expect(checkAgainst(body("mcpTokens.create"), { name: "x", expiryDays: null }).ok).toBe(false);
    expect(checkAgainst(body("mcpTokens.create"), { name: "x".repeat(65) }).ok).toBe(false);
    expect(checkAgainst(body("mcpTokens.create"), { name: "agent", expiryDays: 90 }).ok).toBe(true);
  });

  it("rejects tax records with impossible dates and oversized bulk arrays", () => {
    const record = {
      type: "income",
      source: "paye",
      category: "paye_bonus",
      name: "Bonus",
      amount: 100,
      date: "2026-02-30",
    };
    expect(checkAgainst(body("tax.create"), record).ok).toBe(false);
    expect(checkAgainst(body("tax.create"), { ...record, date: "2026-04-06" }).ok).toBe(true);
    const many = Array.from({ length: 501 }, () => ({ ...record, date: "2026-04-06" }));
    expect(checkAgainst(body("tax.bulkCreate"), { records: many }).ok).toBe(false);
  });
});
