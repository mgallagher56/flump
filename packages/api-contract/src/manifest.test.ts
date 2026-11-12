import { describe, expect, it } from "vitest";
import { allRoutes, CONTRACT_GROUPS, findRoute } from "./manifest.js";
import { checkAgainst } from "./validate.js";

describe("route manifest", () => {
  it("has 42 routes (44 in the E21 plan minus the two password routes E20 deleted) with unique ids and unique method+path pairs", () => {
    expect(allRoutes).toHaveLength(42);
    expect(new Set(allRoutes.map((r) => r.id)).size).toBe(allRoutes.length);
    expect(new Set(allRoutes.map((r) => `${r.method} ${r.path}`)).size).toBe(allRoutes.length);
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
    expect(bodyless).toEqual([
      "bankConnections.refresh",
      "bankConnections.sync",
      "budget.seedDefaults",
      "mcp.post",
      "profile.resetFinancialData",
      "profile.sendPasswordReset",
    ]);
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
        { path: "name", code: "invalid_type" },
        { path: "balance", code: "invalid_type" },
        { path: "userId", code: "unrecognized_keys" },
      ]),
    });
  });

  it("never puts values in issues", () => {
    const result = checkAgainst(body("accounts.create"), { name: "secret-name", balance: -5 });
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
      category: "salary",
      name: "Pay",
      amount: 100,
      date: "2026-02-30",
    };
    expect(checkAgainst(body("tax.create"), record).ok).toBe(false);
    expect(checkAgainst(body("tax.create"), { ...record, date: "2026-04-06" }).ok).toBe(true);
    const many = Array.from({ length: 501 }, () => ({ ...record, date: "2026-04-06" }));
    expect(checkAgainst(body("tax.bulkCreate"), { records: many }).ok).toBe(false);
  });
});
