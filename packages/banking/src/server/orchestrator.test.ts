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
});
