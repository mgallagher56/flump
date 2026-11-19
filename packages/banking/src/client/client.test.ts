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

describe("getConsentStatus boundaries", () => {
  it("needs re-authorisation at the moment the consent expires", () => {
    // Zero days left: the consent is no longer valid, so it is not merely expiring soon.
    const now = new Date("2026-06-01T12:00:00Z");
    expect(getConsentStatus(now.toISOString(), now)).toBe("REAUTH_REQUIRED");
  });
});

describe("account category groups", () => {
  // Groups and asset flags follow the category names and the sign convention: the seven cash,
  // savings, ISA, investment and pension categories are assets; cards, overdrafts, loans, car
  // finance and mortgages are not.
  it.each([
    ["CURRENT", "CASH", true],
    ["SAVINGS", "SAVINGS_ISA", true],
    ["CASH_ISA", "SAVINGS_ISA", true],
    ["STOCKS_ISA", "SAVINGS_ISA", true],
    ["GENERAL_INVESTMENT", "INVESTMENTS_PENSIONS", true],
    ["PENSION_WORKPLACE", "INVESTMENTS_PENSIONS", true],
    ["PENSION_SIPP", "INVESTMENTS_PENSIONS", true],
    ["CREDIT_CARD", "CREDIT_DEBT", false],
    ["OVERDRAFT", "CREDIT_DEBT", false],
    ["LOAN_PERSONAL", "CREDIT_DEBT", false],
    ["CAR_FINANCE_PCP_HP", "CREDIT_DEBT", false],
    ["MORTGAGE_RESIDENTIAL", "MORTGAGES", false],
    ["MORTGAGE_BTL", "MORTGAGES", false],
  ] as const)("%s is in group %s with isAsset %s", (category, group, isAsset) => {
    const meta = getAccountCategoryMetadata(category);
    expect(meta.group).toBe(group);
    expect(meta.isAsset).toBe(isAsset);
    expect(meta.label).not.toBe("");
  });

  it("gives every category its own label", () => {
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
    const labels = new Set(categories.map((c) => getAccountCategoryMetadata(c).label));
    expect(labels.size).toBe(categories.length);
  });
});

describe("budget bucket priority", () => {
  // Only the priority bills bucket (housing, council tax, energy) is a priority.
  it.each([
    ["PRIORITY_HOUSING_COUNCIL_ENERGY", true],
    ["ESSENTIAL_BILLS_GROCERIES", false],
    ["DEBT_MINIMUM_REPAYMENT", false],
    ["DEBT_OVERPAYMENT", false],
    ["DISCRETIONARY_WANTS", false],
    ["SAVINGS_INVESTMENTS_TRANSFER", false],
    ["INCOME", false],
  ] as const)("%s has isPriority %s", (bucket, isPriority) => {
    const meta = getBudgetBucketMetadata(bucket);
    expect(meta.isPriority).toBe(isPriority);
    expect(meta.label).not.toBe("");
    expect(meta.color).not.toBe("");
  });
});

describe("budget bucket labels", () => {
  it("gives every bucket its own label and colour", () => {
    const buckets: FlumpBudgetBucket[] = [
      "PRIORITY_HOUSING_COUNCIL_ENERGY",
      "ESSENTIAL_BILLS_GROCERIES",
      "DEBT_MINIMUM_REPAYMENT",
      "DEBT_OVERPAYMENT",
      "DISCRETIONARY_WANTS",
      "SAVINGS_INVESTMENTS_TRANSFER",
      "INCOME",
    ];
    const metas = buckets.map((b) => getBudgetBucketMetadata(b));
    expect(new Set(metas.map((m) => m.label)).size).toBe(buckets.length);
    expect(new Set(metas.map((m) => m.color)).size).toBe(buckets.length);
  });
});
