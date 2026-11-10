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

  it("safely handles plaintext legacy tokens without error", () => {
    const legacyToken = "pat_starling_legacy_token_not_encrypted";
    const result = BankSyncOrchestrator.decryptToken(legacyToken);
    expect(result).toBe(legacyToken);
  });

  it("normalizes balances enforcing sign convention law", () => {
    // Assets must be positive
    expect(BankSyncOrchestrator.normalizeAccountBalance("Current", -1500)).toBe(1500);
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
  });

  it("generates 12 months history points", () => {
    const history = BankSyncOrchestrator.generateMockHistory(1000, "Current", 2026, 11);
    expect(history.length).toBe(12);
    expect(history[0]?.year).toBe(2026);
    expect(history[0]?.month).toBe(11);
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
