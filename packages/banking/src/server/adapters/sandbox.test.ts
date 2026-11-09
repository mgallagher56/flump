import { describe, expect, it } from "vitest";
import { validateSignConvention } from "../../core/sign-enforcement.js";
import { SandboxAdapter } from "./sandbox.js";

describe("banking server: SandboxAdapter", () => {
  it("creates link session with sandbox URI", async () => {
    const adapter = new SandboxAdapter("debt");
    const session = await adapter.createLinkSession("user_123");
    expect(session.linkTokenOrUrl).toContain("sandbox://link");
    expect(session.expiresAt).toBeDefined();
  });

  it("exchanges public token for encrypted token with 90-day UK consent", async () => {
    const adapter = new SandboxAdapter("debt");
    const exchanged = await adapter.exchangePublicToken("sandbox_token_debt");
    expect(exchanged.accessTokenEncrypted).toContain(":");
    expect(exchanged.providerItemId).toContain("sandbox_item_debt");
    const consentDate = new Date(exchanged.consentExpiresAt);
    expect(consentDate.getTime()).toBeGreaterThan(Date.now() + 80 * 24 * 60 * 60 * 1000);
  });

  it("returns valid debt persona accounts adhering strictly to SIGN CONVENTION LAW", async () => {
    const adapter = new SandboxAdapter("debt");
    const exchanged = await adapter.exchangePublicToken("sandbox_token_debt");
    const accounts = await adapter.getAccounts(exchanged.accessTokenEncrypted);

    expect(accounts.length).toBeGreaterThan(0);
    for (const acc of accounts) {
      expect(validateSignConvention(acc)).toBe(true);
    }

    const overdraft = accounts.find((a) => a.category === "OVERDRAFT");
    expect(overdraft).toBeDefined();
    expect(overdraft?.netWorthImpactGbp).toBeLessThan(0);
    expect(overdraft?.principalOwedGbp).toBeGreaterThan(0);
  });

  it("returns valid wealth persona accounts adhering strictly to SIGN CONVENTION LAW", async () => {
    const adapter = new SandboxAdapter("wealth");
    const exchanged = await adapter.exchangePublicToken("sandbox_token_wealth");
    const accounts = await adapter.getAccounts(exchanged.accessTokenEncrypted);

    expect(accounts.length).toBeGreaterThan(0);
    for (const acc of accounts) {
      expect(validateSignConvention(acc)).toBe(true);
    }

    const resMortgage = accounts.find((a) => a.category === "MORTGAGE_RESIDENTIAL");
    expect(resMortgage).toBeDefined();
    expect(resMortgage?.principalOwedGbp).toBe(285000);
    expect(resMortgage?.netWorthImpactGbp).toBe(-285000);
  });

  it("syncs categorized UK transactions", async () => {
    const adapter = new SandboxAdapter("debt");
    const exchanged = await adapter.exchangePublicToken("sandbox_token_debt");
    const sync = await adapter.syncTransactions(exchanged.accessTokenEncrypted);

    expect(sync.added.length).toBeGreaterThan(0);
    const rentTx = sync.added.find((t) => t.merchantOrDescription.includes("Rent"));
    expect(rentTx?.flumpBucket).toBe("PRIORITY_HOUSING_COUNCIL_ENERGY");
    expect(rentTx?.amountGbp).toBeLessThan(0); // Outflow negative
  });
});
