import { describe, expect, it } from "vitest";
import {
  enforceSignConvention,
  isAssetCategory,
  isLiabilityCategory,
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

  it("enforces SIGN CONVENTION LAW on assets: netWorth positive, principalOwed 0", () => {
    const rawAsset: NormalizedAccount = {
      externalAccountId: "acc-1",
      provider: "manual",
      institutionName: "Monzo",
      name: "Current",
      category: "CURRENT",
      currency: "GBP",
      netWorthImpactGbp: -2500, // mistakenly entered as negative
      principalOwedGbp: 2500,
      isTaxFreeIsaWrapper: false,
      lastSyncedAt: new Date().toISOString(),
    };

    const enforced = enforceSignConvention(rawAsset);
    expect(enforced.netWorthImpactGbp).toBe(2500);
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
