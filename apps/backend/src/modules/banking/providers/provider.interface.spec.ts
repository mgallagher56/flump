import { describe, expect, it } from "vitest";
import { type ProviderAccount, toNormalizedAccount } from "./provider.interface";

const base = { externalAccountId: "x1", name: "Acct", currency: "GBP" };

describe("toNormalizedAccount signs (E23 C-15)", () => {
  it("keeps the real sign of an overdrawn current account", () => {
    const a = toNormalizedAccount(
      { ...base, type: "Current", balance: -1500 } as ProviderAccount,
      "monzo" as never,
      "Bank",
    );
    expect(a.netWorthImpactGbp).toBe(-1500);
    expect(a.principalOwedGbp).toBe(0);
  });

  it("keeps positive assets positive and normalises debts to -owed", () => {
    const asset = toNormalizedAccount(
      { ...base, type: "Saving", balance: 300 } as ProviderAccount,
      "monzo" as never,
      "Bank",
    );
    expect(asset.netWorthImpactGbp).toBe(300);
    for (const stored of [1200, -1200]) {
      const card = toNormalizedAccount(
        { ...base, type: "Credit Card", balance: stored } as ProviderAccount,
        "monzo" as never,
        "Bank",
      );
      expect(card.netWorthImpactGbp).toBe(-1200);
      expect(card.principalOwedGbp).toBe(1200);
    }
  });
});
