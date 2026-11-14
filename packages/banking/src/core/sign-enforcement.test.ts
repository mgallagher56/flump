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
