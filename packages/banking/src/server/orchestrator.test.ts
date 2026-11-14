import { describe, expect, it } from "vitest";
import { BankSyncOrchestrator } from "./orchestrator.js";

describe("BankSyncOrchestrator", () => {
  it("encrypts and decrypts banking tokens in the versioned format", () => {
    const rawToken = "access_token_super_secret_12345";
    const encrypted = BankSyncOrchestrator.encryptToken(rawToken);

    expect(encrypted).not.toEqual(rawToken);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted.split(":")).toHaveLength(4);
    expect(BankSyncOrchestrator.decryptToken(encrypted)).toBe(rawToken);
    expect(BankSyncOrchestrator.tokenNeedsReencrypt(encrypted)).toBe(false);
  });

  it("passes associated data through to encryption and decryption", () => {
    const encrypted = BankSyncOrchestrator.encryptToken("tok", "conn-1:accessToken");
    expect(BankSyncOrchestrator.decryptToken(encrypted, "conn-1:accessToken")).toBe("tok");
    expect(() => BankSyncOrchestrator.decryptToken(encrypted, "conn-2:accessToken")).toThrow();
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

  it("detects expiring tokens accurately based on margin", () => {
    const now = Date.now();
    const soon = new Date(now + 60_000); // 1 minute in future
    const distant = new Date(now + 3600_000); // 1 hour in future

    expect(BankSyncOrchestrator.isTokenExpiring(soon, 300_000)).toBe(true);
    expect(BankSyncOrchestrator.isTokenExpiring(distant, 300_000)).toBe(false);
    expect(BankSyncOrchestrator.isTokenExpiring(null)).toBe(false);
    expect(BankSyncOrchestrator.isTokenExpiring(new Date(now + 60_000).toISOString())).toBe(true);
  });

  it("calculates an expiry date from a TTL", () => {
    expect(BankSyncOrchestrator.calculateExpiryDate(undefined)).toBeUndefined();
    const expiry = BankSyncOrchestrator.calculateExpiryDate(3600);
    expect(expiry!.getTime()).toBeGreaterThan(Date.now() + 3_500_000);
  });
});
