import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FlumpAccountCategory, FlumpBudgetBucket, NormalizedAccount } from "../core/types.js";
import {
  calculateNetWorth,
  getAccountCategoryMetadata,
  getBudgetBucketMetadata,
  getConsentStatus,
} from "./index.js";

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

  it("calculates net worth and weighted average savings yield across accounts", () => {
    const accounts: NormalizedAccount[] = [
      {
        externalAccountId: "1",
        provider: "manual",
        institutionName: "Monzo",
        name: "Current",
        category: "CURRENT",
        currency: "GBP",
        netWorthImpactGbp: 2000,
        principalOwedGbp: 0,
        interestRateApr: 0,
        isTaxFreeIsaWrapper: false,
        lastSyncedAt: "",
      },
      {
        externalAccountId: "2",
        provider: "manual",
        institutionName: "Chip",
        name: "Instant Access Savings",
        category: "SAVINGS",
        currency: "GBP",
        netWorthImpactGbp: 8000,
        principalOwedGbp: 0,
        interestRateApr: 4.8,
        isTaxFreeIsaWrapper: false,
        lastSyncedAt: "",
      },
      {
        externalAccountId: "3",
        provider: "manual",
        institutionName: "Barclaycard",
        name: "Credit Card",
        category: "CREDIT_CARD",
        currency: "GBP",
        netWorthImpactGbp: -2500,
        principalOwedGbp: 2500,
        interestRateApr: 24.9,
        isTaxFreeIsaWrapper: false,
        lastSyncedAt: "",
      },
      {
        externalAccountId: "4",
        provider: "manual",
        institutionName: "Halifax",
        name: "Cash ISA",
        category: "CASH_ISA",
        currency: "GBP",
        netWorthImpactGbp: 5000,
        principalOwedGbp: 0,
        interestRateApr: 5.0,
        isTaxFreeIsaWrapper: true,
        lastSyncedAt: "",
      },
    ];

    const result = calculateNetWorth(accounts);
    expect(result.totalAssetsGbp).toBe(15000);
    expect(result.totalLiabilitiesGbp).toBe(2500);
    expect(result.totalNetWorthGbp).toBe(12500);
    expect(result.liquidCashGbp).toBe(15000);
    expect(result.weightedAverageSavingsYieldApr).toBeGreaterThan(0);

    // Empty accounts
    const emptyResult = calculateNetWorth([]);
    expect(emptyResult.totalNetWorthGbp).toBe(0);
    expect(emptyResult.weightedAverageSavingsYieldApr).toBe(0);
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
