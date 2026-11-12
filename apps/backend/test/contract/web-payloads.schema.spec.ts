import { allRoutes, checkAgainst } from "@flump/api-contract";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_CREATE_PAYLOADS,
  ACCOUNT_UPDATE_PAYLOADS,
  BUDGET_CATEGORY_PAYLOAD,
  BUDGET_CREATE_PAYLOAD,
  BUDGET_UPDATE_PAYLOAD,
  ONBOARDING_ACCOUNTS,
  ONBOARDING_BUDGET_ENTRIES,
  ONBOARDING_COMPLETE,
  ONBOARDING_PROFILE,
  PROFILE_FIELDS_NOT_PERSISTED,
} from "./web-payloads";

/**
 * Runs every payload apps/web sends (web-payloads.ts, paired with web tests for onboarding)
 * through the @flump/api-contract request schemas (E21 phase 1). A payload that stops matching its
 * schema, or a schema that starts rejecting what web sends, fails here before it can show up in
 * the production shadow log.
 *
 * The EXPECTED_UNKNOWN_KEYS lists are the known mismatches. They are shrink-only: fixing the web
 * or adding the backend field means removing the entry.
 */
const body = (id: string) => {
  const route = allRoutes.find((r) => r.id === id);
  if (!route?.body) throw new Error(`no body schema for ${id}`);
  return route.body;
};

const violations = (id: string, payload: unknown) => {
  const result = checkAgainst(body(id), payload);
  return result.ok ? [] : result.issues.map((i) => `${i.path}:${i.code}`).sort();
};

const unknown = (keys: readonly string[]) => keys.map((k) => `${k}:unrecognized_keys`).sort();

describe("web payloads against @flump/api-contract schemas", () => {
  it("onboarding profile: only the fields the backend drops are flagged", () => {
    expect(violations("profile.update", ONBOARDING_PROFILE)).toEqual(
      unknown(PROFILE_FIELDS_NOT_PERSISTED),
    );
    expect(violations("profile.update", ONBOARDING_COMPLETE)).toEqual([]);
  });

  it("onboarding accounts and budget entries are clean", () => {
    for (const account of ONBOARDING_ACCOUNTS) {
      expect(violations("accounts.create", account)).toEqual([]);
    }
    for (const entry of ONBOARDING_BUDGET_ENTRIES) {
      expect(violations("budget.create", entry)).toEqual([]);
    }
  });

  it("account create and update payloads from every web page are clean", () => {
    for (const payload of Object.values(ACCOUNT_CREATE_PAYLOADS)) {
      expect(violations("accounts.create", payload)).toEqual([]);
    }
    for (const payload of Object.values(ACCOUNT_UPDATE_PAYLOADS)) {
      expect(violations("accounts.update", payload)).toEqual([]);
      expect(violations("accounts.replace", payload)).toEqual([]);
    }
  });

  it("budget payloads: server-owned and unpersisted keys are flagged as unknown", () => {
    expect(violations("budget.create", BUDGET_CREATE_PAYLOAD)).toEqual(
      unknown(["contractEndDate", "isDefault", "isPrimaryIncome"]),
    );
    expect(violations("budget.update", BUDGET_UPDATE_PAYLOAD)).toEqual(
      unknown(["contractEndDate"]),
    );
    expect(violations("budget.addCategory", BUDGET_CATEGORY_PAYLOAD)).toEqual([]);
  });

  it("MCP token create: web's 'never expires' choice sends expiryDays null, which the contract rejects (E17 D5-A)", () => {
    // McpConnectionCard sends null for "no expiry". It is real traffic, not noise: expect this line
    // in the shadow log until the card drops the option.
    expect(violations("mcpTokens.create", { name: "Claude", expiryDays: null })).toEqual([
      "expiryDays:invalid_type",
    ]);
    expect(violations("mcpTokens.create", { name: "Claude", expiryDays: 30 })).toEqual([]);
  });
});
