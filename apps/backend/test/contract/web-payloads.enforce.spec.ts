import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContractShadowInterceptor } from "../../src/contract/contract-shadow.interceptor";
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
} from "./web-payloads";

/**
 * E21 phase 2: with CONTRACT_MODE=enforce and the default groups, every payload apps/web sends
 * must still reach the handler (unknown keys are stripped, not rejected). Complements the real
 * Postgres replay in web-mutations.contract.spec.ts, which needs TEST_DATABASE_URL.
 */
const ID = "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f";

const passes = (method: string, path: string, body: unknown, params: object = {}) => {
  const next = { handle: vi.fn(() => of("handled")) };
  const req = { method, route: { path }, params, query: {}, body };
  const context = { getType: () => "http", switchToHttp: () => ({ getRequest: () => req }) };
  new ContractShadowInterceptor().intercept(context as never, next);
  return next.handle.mock.calls.length === 1;
};

describe("web payloads in enforce mode", () => {
  beforeEach(() => {
    process.env.CONTRACT_MODE = "enforce";
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    delete process.env.CONTRACT_MODE;
    delete process.env.CONTRACT_ENFORCE_GROUPS;
    vi.restoreAllMocks();
  });

  it("accepts onboarding, account and budget payloads", () => {
    for (const body of [ONBOARDING_PROFILE, ONBOARDING_COMPLETE]) {
      expect(passes("PATCH", "/user-profile", body)).toBe(true);
    }
    for (const body of [...ONBOARDING_ACCOUNTS, ...Object.values(ACCOUNT_CREATE_PAYLOADS)]) {
      expect(passes("POST", "/accounts", body)).toBe(true);
    }
    for (const body of Object.values(ACCOUNT_UPDATE_PAYLOADS)) {
      expect(passes("PATCH", "/accounts/:id", body, { id: ID })).toBe(true);
      expect(passes("PUT", "/accounts/:id", body, { id: ID })).toBe(true);
    }
    for (const body of [...ONBOARDING_BUDGET_ENTRIES, BUDGET_CREATE_PAYLOAD]) {
      expect(passes("POST", "/budget-entries", body)).toBe(true);
    }
    expect(passes("PATCH", "/budget-entries/:id", BUDGET_UPDATE_PAYLOAD, { id: ID })).toBe(true);
    expect(passes("POST", "/budget-entries/categories", BUDGET_CATEGORY_PAYLOAD)).toBe(true);
  });

  it("keeps the MCP token 'never expires' request working while mcp-tokens is held back", () => {
    expect(passes("POST", "/mcp-tokens", { name: "Claude", expiryDays: null })).toBe(true);
  });

  it("accepts the tax bulk copy payload web sends once the tax group is enforced", () => {
    process.env.CONTRACT_ENFORCE_GROUPS = "tax";
    const capped = [{ id: ID, endDate: "2026-04-05" }];
    expect(passes("POST", "/tax-records/bulk", { records: [], capPreviousRecordIds: capped })).toBe(
      true,
    );
    expect(() =>
      passes("POST", "/tax-records/bulk", { records: [], capPreviousRecordIds: [ID] }),
    ).toThrow();
    delete process.env.CONTRACT_ENFORCE_GROUPS;
  });

  it("rejects a malformed id on an enforced route", () => {
    expect(() => passes("PATCH", "/accounts/:id", { balance: 1 }, { id: "nope" })).toThrow();
  });
});
