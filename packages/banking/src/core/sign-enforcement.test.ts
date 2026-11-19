import { describe, expect, it } from "vitest";
import {
  enforceSignConvention,
  isAssetCategory,
  isLiabilityCategory,
  isStoredNegativeAccountType,
  normalizeStoredBalance,
  STORED_NEGATIVE_ACCOUNT_TYPES,
  validateSignConvention,
} from "./sign-enforcement.js";
import type { NormalizedAccount } from "./types.js";

describe("banking core: sign-enforcement", () => {
  it("correctly categorizes assets and liabilities", () => {
    expect(isAssetCategory("CURRENT")).toBe(true);
    expect(isAssetCategory("SAVINGS")).toBe(true);
    expect(isAssetCategory("CASH_ISA")).toBe(true);
    expect(isAssetCategory("STOCKS_ISA")).toBe(true);
    expect(isAssetCategory("PENSION_WORKPLACE")).toBe(true);

    expect(isLiabilityCategory("CREDIT_CARD")).toBe(true);
    expect(isLiabilityCategory("OVERDRAFT")).toBe(true);
    expect(isLiabilityCategory("LOAN_PERSONAL")).toBe(true);
    expect(isLiabilityCategory("MORTGAGE_RESIDENTIAL")).toBe(true);
  });

  it("enforces SIGN CONVENTION LAW on assets: real sign kept, principalOwed 0", () => {
    const rawAsset: NormalizedAccount = {
      externalAccountId: "acc-1",
      provider: "manual",
      institutionName: "Monzo",
      name: "Current",
      category: "CURRENT",
      currency: "GBP",
      netWorthImpactGbp: -2500, // overdrawn current account
      principalOwedGbp: 2500,
      isTaxFreeIsaWrapper: false,
      lastSyncedAt: new Date().toISOString(),
    };

    const enforced = enforceSignConvention(rawAsset);
    expect(enforced.netWorthImpactGbp).toBe(-2500);
    expect(enforced.principalOwedGbp).toBe(0);
    expect(validateSignConvention(enforced)).toBe(true);
  });

  it("enforces SIGN CONVENTION LAW on liabilities: netWorth negative, principalOwed positive", () => {
    const rawLiability: NormalizedAccount = {
      externalAccountId: "acc-cc-1",
      provider: "manual",
      institutionName: "Barclaycard",
      name: "Credit Card",
      category: "CREDIT_CARD",
      currency: "GBP",
      netWorthImpactGbp: 3200, // entered as positive
      principalOwedGbp: 3200,
      isTaxFreeIsaWrapper: false,
      lastSyncedAt: new Date().toISOString(),
    };

    const enforced = enforceSignConvention(rawLiability);
    expect(enforced.netWorthImpactGbp).toBe(-3200);
    expect(enforced.principalOwedGbp).toBe(3200);
    expect(validateSignConvention(enforced)).toBe(true);
  });
});

describe("normalizeStoredBalance (BE-05 stored-balance rule)", () => {
  it("lists every stored-negative type, Student Loan included", () => {
    expect([...STORED_NEGATIVE_ACCOUNT_TYPES]).toEqual([
      "Mortgage",
      "Credit Card",
      "Loan",
      "Overdraft",
      "Student Loan",
    ]);
  });

  it("stores a liability as minus its absolute value, whatever sign it arrives with", () => {
    for (const type of STORED_NEGATIVE_ACCOUNT_TYPES) {
      expect(normalizeStoredBalance(type, 500)).toBe(-500);
      expect(normalizeStoredBalance(type, -500)).toBe(-500);
      expect(normalizeStoredBalance(type, 0.01)).toBe(-0.01);
      expect(isStoredNegativeAccountType(type)).toBe(true);
    }
  });

  it("keeps any other type's sign, and never returns -0", () => {
    for (const type of [
      "Current",
      "Saving",
      "Investment",
      "Pension",
      "Property",
      "Owed",
      "",
      "credit card",
    ]) {
      expect(normalizeStoredBalance(type, 250)).toBe(250);
      expect(normalizeStoredBalance(type, -250)).toBe(-250);
      expect(isStoredNegativeAccountType(type)).toBe(false);
    }
    expect(Object.is(normalizeStoredBalance("Credit Card", 0), 0)).toBe(true);
    expect(Object.is(normalizeStoredBalance("Credit Card", -0), 0)).toBe(true);
    expect(normalizeStoredBalance(null, 5)).toBe(5);
  });
});

const account = (overrides: Partial<NormalizedAccount>): NormalizedAccount => ({
  externalAccountId: "acc",
  provider: "manual",
  institutionName: "Bank",
  name: "Account",
  category: "CREDIT_CARD",
  currency: "GBP",
  netWorthImpactGbp: 0,
  principalOwedGbp: 0,
  isTaxFreeIsaWrapper: false,
  lastSyncedAt: "2026-11-19T00:00:00.000Z",
  ...overrides,
});

describe("asset and liability category lists", () => {
  it("lists all seven asset categories and all six liability categories", () => {
    for (const c of [
      "CURRENT",
      "SAVINGS",
      "CASH_ISA",
      "STOCKS_ISA",
      "GENERAL_INVESTMENT",
      "PENSION_WORKPLACE",
      "PENSION_SIPP",
    ] as const) {
      expect(isAssetCategory(c)).toBe(true);
      expect(isLiabilityCategory(c)).toBe(false);
    }
    for (const c of [
      "CREDIT_CARD",
      "OVERDRAFT",
      "LOAN_PERSONAL",
      "CAR_FINANCE_PCP_HP",
      "MORTGAGE_RESIDENTIAL",
      "MORTGAGE_BTL",
    ] as const) {
      expect(isLiabilityCategory(c)).toBe(true);
      expect(isAssetCategory(c)).toBe(false);
    }
  });
});

describe("enforceSignConvention on liabilities", () => {
  it("takes a positive principal owed as the amount owed", () => {
    // principal 3000 is positive, so it wins over the 2500 net worth figure: owed 3000.
    const out = enforceSignConvention(
      account({ netWorthImpactGbp: -2500, principalOwedGbp: 3000 }),
    );
    expect(out.principalOwedGbp).toBe(3000);
    expect(out.netWorthImpactGbp).toBe(-3000);
  });

  it("falls back to the size of the net worth figure when no principal is given", () => {
    // principal 0 is not positive, so owed = |1200| = 1200, and net worth becomes -1200.
    const out = enforceSignConvention(account({ netWorthImpactGbp: 1200, principalOwedGbp: 0 }));
    expect(out.principalOwedGbp).toBe(1200);
    expect(out.netWorthImpactGbp).toBe(-1200);
  });
});

describe("validateSignConvention", () => {
  it("rejects an asset that carries a principal owed", () => {
    expect(validateSignConvention(account({ category: "CURRENT", principalOwedGbp: 5 }))).toBe(
      false,
    );
  });

  it("accepts a cleared liability with both figures at zero", () => {
    expect(validateSignConvention(account({ netWorthImpactGbp: 0, principalOwedGbp: 0 }))).toBe(
      true,
    );
  });

  it("rejects a liability with positive net worth, even when the figures cancel", () => {
    // 100 + (-100) = 0, but a liability's net worth must not be positive.
    expect(
      validateSignConvention(account({ netWorthImpactGbp: 100, principalOwedGbp: -100 })),
    ).toBe(false);
    // 0.0005 + 0.0004 = 0.0009 is within the tolerance and principal is not negative, but the
    // net worth figure is still positive.
    expect(
      validateSignConvention(account({ netWorthImpactGbp: 0.0005, principalOwedGbp: 0.0004 })),
    ).toBe(false);
  });

  it("rejects a liability with a negative principal, even when the figures nearly cancel", () => {
    // -0.0005 + (-0.0004) = -0.0009, within the tolerance, but principal owed must not be negative.
    expect(
      validateSignConvention(account({ netWorthImpactGbp: -0.0005, principalOwedGbp: -0.0004 })),
    ).toBe(false);
  });

  it("rejects a liability whose two figures disagree", () => {
    // -100 + 50 = -50: the net worth figure is not minus the amount owed.
    expect(validateSignConvention(account({ netWorthImpactGbp: -100, principalOwedGbp: 50 }))).toBe(
      false,
    );
  });
});
