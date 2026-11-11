import { describe, expect, it } from "vitest";
import { validateSignConvention } from "../../core/sign-enforcement.js";
import { mapPlaidAccountCategory, mapPlaidCategoryToFlumpBucket, PlaidAdapter } from "./plaid.js";

describe("banking server: PlaidAdapter", () => {
  it("maps Plaid account types accurately", () => {
    expect(mapPlaidAccountCategory("depository", "checking")).toBe("CURRENT");
    expect(mapPlaidAccountCategory("depository", "savings")).toBe("SAVINGS");
    expect(mapPlaidAccountCategory("credit", "credit card")).toBe("CREDIT_CARD");
    expect(mapPlaidAccountCategory("loan", "mortgage")).toBe("MORTGAGE_RESIDENTIAL");
    expect(mapPlaidAccountCategory("investment", "sipp")).toBe("PENSION_SIPP");
  });

  it("maps Plaid categories to Flump budget buckets", () => {
    expect(mapPlaidCategoryToFlumpBucket(100, ["Transfer"])).toBe("INCOME");
    expect(mapPlaidCategoryToFlumpBucket(-50, ["Utilities", "Gas"])).toBe(
      "PRIORITY_HOUSING_COUNCIL_ENERGY",
    );
    expect(mapPlaidCategoryToFlumpBucket(-30, ["Shops", "Supermarkets"])).toBe(
      "ESSENTIAL_BILLS_GROCERIES",
    );
  });

  it("fetches normalized accounts with PlaidAdapter strictly adhering to SIGN CONVENTION LAW", async () => {
    const adapter = new PlaidAdapter();
    const exchanged = await adapter.exchangePublicToken("public-sandbox-token");
    const accounts = await adapter.getAccounts(exchanged.accessTokenEncrypted);

    expect(accounts.length).toBe(2);
    for (const acc of accounts) {
      expect(validateSignConvention(acc)).toBe(true);
    }

    const cc = accounts.find((a) => a.category === "CREDIT_CARD");
    expect(cc?.netWorthImpactGbp).toBeLessThan(0);
    expect(cc?.principalOwedGbp).toBeGreaterThan(0);
  });

  it("syncs transactions mapping Plaid outflow convention to negative Flump amounts", async () => {
    const adapter = new PlaidAdapter();
    const exchanged = await adapter.exchangePublicToken("public-sandbox-token");
    const sync = await adapter.syncTransactions(exchanged.accessTokenEncrypted);

    expect(sync.added.length).toBe(2);
    const grocery = sync.added.find((t) => t.merchantOrDescription.includes("Sainsbury"));
    expect(grocery?.amountGbp).toBe(-42.5); // Outflow negative
    const salary = sync.added.find((t) => t.merchantOrDescription.includes("Payroll"));
    expect(salary?.amountGbp).toBe(2500); // Inflow positive
  });

  it("creates link session and revokes connection", async () => {
    const adapter = new PlaidAdapter();
    const session = await adapter.createLinkSession("user_123", "conn_456");
    expect(session.linkTokenOrUrl).toContain("user_123");
    expect(session.expiresAt).toBeDefined();

    const exchanged = await adapter.exchangePublicToken("public-sandbox-token");
    await expect(adapter.revokeConnection(exchanged.accessTokenEncrypted)).resolves.toBeUndefined();
  });
});
