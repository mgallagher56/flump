import { describe, expect, it } from "vitest";
import { BankSyncOrchestrator } from "./orchestrator.js";

describe("BankSyncOrchestrator", () => {
  it("encrypts and decrypts banking tokens correctly", () => {
    const rawToken = "access_token_super_secret_12345";
    const encrypted = BankSyncOrchestrator.encryptToken(rawToken);

    expect(encrypted).not.toEqual(rawToken);
    expect(encrypted.split(":").length).toBe(3);

    const decrypted = BankSyncOrchestrator.decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("throws on plaintext legacy tokens instead of returning them", () => {
    const legacyToken = "pat_starling_legacy_token_not_encrypted";
    expect(() => BankSyncOrchestrator.decryptToken(legacyToken)).toThrow();
  });

  it("normalizes balances enforcing sign convention law", () => {
    // Assets keep their real sign: an overdrawn current account stays negative (F-02)
    expect(BankSyncOrchestrator.normalizeAccountBalance("Current", -1500)).toBe(-1500);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Current", 1500)).toBe(1500);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Saving", 3000)).toBe(3000);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Investment", 25000)).toBe(25000);

    // Liabilities must be negative
    expect(BankSyncOrchestrator.normalizeAccountBalance("Mortgage", 240000)).toBe(-240000);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Mortgage", -240000)).toBe(-240000);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Credit Card", 1200)).toBe(-1200);
    expect(BankSyncOrchestrator.normalizeAccountBalance("Credit Card", -1200)).toBe(-1200);
  });

  it("provides canonical mock accounts with proper liability signs", () => {
    const hsbc = BankSyncOrchestrator.getMockInstitutionAccounts("hsbc");
    const mortgage = hsbc.find((a) => a.type === "Mortgage");
    expect(mortgage?.balance).toBeLessThan(0);

    const barclays = BankSyncOrchestrator.getMockInstitutionAccounts("barclays");
    const card = barclays.find((a) => a.type === "Credit Card");
    expect(card?.balance).toBeLessThan(0);

    const unknown = BankSyncOrchestrator.getMockInstitutionAccounts("nonexistent_bank");
    expect(unknown.length).toBeGreaterThan(0);
  });

  it("generates 12 months history points across year boundaries for different account types", () => {
    const historyCurrent = BankSyncOrchestrator.generateMockHistory(1000, "Current", 2026, 3);
    expect(historyCurrent.length).toBe(12);
    expect(historyCurrent[0]?.year).toBe(2026);
    expect(historyCurrent[0]?.month).toBe(3);

    const historyMortgage = BankSyncOrchestrator.generateMockHistory(-200000, "Mortgage", 2026, 1);
    expect(historyMortgage.length).toBe(12);

    const historySaving = BankSyncOrchestrator.generateMockHistory(5000, "Saving", 2026, 6);
    expect(historySaving.length).toBe(12);

    const historyCard = BankSyncOrchestrator.generateMockHistory(-1500, "Credit Card", 2026, 6);
    expect(historyCard.length).toBe(12);
  });

  it("generates mock transactions for different account types", () => {
    const now = new Date("2026-05-10T12:00:00Z");

    const currentTxs = BankSyncOrchestrator.generateMockTransactions("Current", "Monzo", now);
    expect(currentTxs.length).toBeGreaterThan(0);

    const savingTxs = BankSyncOrchestrator.generateMockTransactions("Saving", "Monzo", now);
    expect(savingTxs.length).toBe(1);

    const mortgageTxs = BankSyncOrchestrator.generateMockTransactions("Mortgage", "Santander", now);
    expect(mortgageTxs.length).toBe(1);

    const cardTxs = BankSyncOrchestrator.generateMockTransactions("Credit Card", "Amex", now);
    expect(cardTxs.length).toBe(1);

    const otherTxs = BankSyncOrchestrator.generateMockTransactions("Other", "Unknown", now);
    expect(otherTxs.length).toBe(0);
  });

  it("generates canonical OAuth URLs for banks", () => {
    const monzoUrl = BankSyncOrchestrator.getOAuthUrl(
      "monzo",
      "http://localhost:3000/auth/callback",
    );
    expect(monzoUrl).toContain("https://auth.monzo.com/?client_id=");
    expect(monzoUrl).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback");

    const starlingUrl = BankSyncOrchestrator.getOAuthUrl(
      "starling",
      "http://localhost:3000/auth/callback",
    );
    expect(starlingUrl).toContain("https://oauth.starlingbank.com/?client_id=");

    const unknown = BankSyncOrchestrator.getOAuthUrl(
      "unknown-bank",
      "http://localhost:3000/auth/callback",
    );
    expect(unknown).toBeNull();
  });

  it("detects expiring tokens accurately based on margin", () => {
    const now = Date.now();
    const soon = new Date(now + 60_000); // 1 minute in future
    const distant = new Date(now + 3600_000); // 1 hour in future

    expect(BankSyncOrchestrator.isTokenExpiring(soon, 300_000)).toBe(true);
    expect(BankSyncOrchestrator.isTokenExpiring(distant, 300_000)).toBe(false);
    expect(BankSyncOrchestrator.isTokenExpiring(null)).toBe(false);
  });

  it("orchestrates token refresh, re-encrypts tokens, and updates expiry", async () => {
    const rawAccessToken = "old-access-token";
    const rawRefreshToken = "old-refresh-token";
    const encAccessToken = BankSyncOrchestrator.encryptToken(rawAccessToken);
    const encRefreshToken = BankSyncOrchestrator.encryptToken(rawRefreshToken);

    const connection = {
      institutionId: "monzo",
      accessToken: encAccessToken,
      refreshToken: encRefreshToken,
      expiresAt: new Date(Date.now() + 60_000), // expiring in 1 min
    };

    const mockExchange = async (plainRefresh: string) => {
      expect(plainRefresh).toBe(rawRefreshToken);
      return {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      };
    };

    const result = await BankSyncOrchestrator.refreshConnectionTokensIfNeeded({
      connection,
      exchangeRefreshToken: mockExchange,
      marginMs: 300_000,
    });

    expect(result.wasRefreshed).toBe(true);
    expect(result.activeAccessToken).toBe("new-access-token");
    expect(result.updatedEncryptedAccessToken).toBeDefined();
    expect(BankSyncOrchestrator.decryptToken(result.updatedEncryptedAccessToken!)).toBe(
      "new-access-token",
    );
    expect(result.updatedEncryptedRefreshToken).toBeDefined();
    expect(BankSyncOrchestrator.decryptToken(result.updatedEncryptedRefreshToken!)).toBe(
      "new-refresh-token",
    );
    expect(result.newExpiresAt).toBeDefined();
  });
});
