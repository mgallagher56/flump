import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FlumpAccountCategory, FlumpBudgetBucket } from "../core/types.js";
import * as client from "./index.js";
import { getAccountCategoryMetadata, getBudgetBucketMetadata, getConsentStatus } from "./index.js";

describe("banking client: helpers & bundle boundary verification", () => {
  it("checks UK Open Banking consent expiration status", () => {
    const now = new Date("2026-06-01T12:00:00Z");

    // 80 days away -> ACTIVE
    const futureExpiry = new Date("2026-08-20T12:00:00Z").toISOString();
    expect(getConsentStatus(futureExpiry, now)).toBe("ACTIVE");

    // 4 days away -> EXPIRING_SOON (< 7 days)
    const expiringSoon = new Date("2026-06-05T12:00:00Z").toISOString();
    expect(getConsentStatus(expiringSoon, now)).toBe("EXPIRING_SOON");

    // Expired yesterday -> REAUTH_REQUIRED
    const expired = new Date("2026-05-31T12:00:00Z").toISOString();
    expect(getConsentStatus(expired, now)).toBe("REAUTH_REQUIRED");

    // Manual account
    expect(getConsentStatus(undefined, now)).toBe("MANUAL");
  });

  it("provides metadata for all account categories", () => {
    const categories: FlumpAccountCategory[] = [
      "CURRENT",
      "SAVINGS",
      "CASH_ISA",
      "STOCKS_ISA",
      "GENERAL_INVESTMENT",
      "PENSION_WORKPLACE",
      "PENSION_SIPP",
      "CREDIT_CARD",
      "OVERDRAFT",
      "LOAN_PERSONAL",
      "CAR_FINANCE_PCP_HP",
      "MORTGAGE_RESIDENTIAL",
      "MORTGAGE_BTL",
    ];

    for (const cat of categories) {
      const meta = getAccountCategoryMetadata(cat);
      expect(meta.label).toBeDefined();
      expect(meta.group).toBeDefined();
      expect(typeof meta.isAsset).toBe("boolean");
    }
  });

  it("provides metadata for all budget buckets", () => {
    const buckets: FlumpBudgetBucket[] = [
      "PRIORITY_HOUSING_COUNCIL_ENERGY",
      "ESSENTIAL_BILLS_GROCERIES",
      "DEBT_MINIMUM_REPAYMENT",
      "DEBT_OVERPAYMENT",
      "DISCRETIONARY_WANTS",
      "SAVINGS_INVESTMENTS_TRANSFER",
      "INCOME",
    ];

    for (const bucket of buckets) {
      const meta = getBudgetBucketMetadata(bucket);
      expect(meta.label).toBeDefined();
      expect(meta.color).toBeDefined();
      expect(typeof meta.isPriority).toBe("boolean");
    }
  });

  it("has no net worth sum of its own: net worth is the engine's selectNetWorth (system audit slice 9)", () => {
    expect("calculateNetWorth" in client).toBe(false);
  });

  it("VERIFICATION GATE: client source file must NEVER import from server or node built-ins", () => {
    const clientIndexPath = resolve(new URL(".", import.meta.url).pathname, "index.ts");
    const clientCode = readFileSync(clientIndexPath, "utf-8");

    expect(clientCode).not.toContain("../server");
    expect(clientCode).not.toContain("/server");
    expect(clientCode).not.toContain("node:crypto");
    expect(clientCode).not.toContain("node:fs");
  });
});
