import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedAccount } from "../core/types.js";
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

  it("provides category and budget metadata", () => {
    const ccMeta = getAccountCategoryMetadata("CREDIT_CARD");
    expect(ccMeta.isAsset).toBe(false);
    expect(ccMeta.group).toBe("CREDIT_DEBT");

    const bucketMeta = getBudgetBucketMetadata("PRIORITY_HOUSING_COUNCIL_ENERGY");
    expect(bucketMeta.isPriority).toBe(true);
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
    ];

    const result = calculateNetWorth(accounts);
    expect(result.totalAssetsGbp).toBe(10000);
    expect(result.totalLiabilitiesGbp).toBe(2500);
    expect(result.totalNetWorthGbp).toBe(7500);
    expect(result.liquidCashGbp).toBe(10000);
    expect(result.weightedAverageSavingsYieldApr).toBe(4.8);
  });

  it("VERIFICATION GATE: client source file must NEVER import from server or node built-ins", () => {
    const clientIndexPath = resolve(new URL(".", import.meta.url).pathname, "index.ts");
    const clientCode = readFileSync(clientIndexPath, "utf-8");

    // Must not import server directory
    expect(clientCode).not.toContain("../server");
    expect(clientCode).not.toContain("/server");
    expect(clientCode).not.toContain("node:crypto");
    expect(clientCode).not.toContain("node:fs");
    expect(clientCode).not.toContain("node:path");
    expect(clientCode).not.toContain("createCipheriv");
    expect(clientCode).not.toContain("createDecipheriv");
  });
});
