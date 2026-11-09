import { describe, expect, it } from "vitest";
import { decryptBankingToken, encryptBankingToken } from "./crypto.js";

describe("banking server: crypto (AES-256-GCM)", () => {
  it("encrypts and decrypts banking access tokens accurately", () => {
    const rawToken = "access-sandbox-9b8132-monzo-open-banking-token-secret-12345";
    const encrypted = encryptBankingToken(rawToken);

    // Format is iv:tag:ciphertext
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0]?.length).toBe(24); // 12 bytes = 24 hex chars
    expect(parts[1]?.length).toBe(32); // 16 bytes = 32 hex chars

    const decrypted = decryptBankingToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("fails decryption with an invalid auth tag or tampered ciphertext", () => {
    const encrypted = encryptBankingToken("super-secret-token");
    const parts = encrypted.split(":");
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]?.slice(0, -2)}ff`;

    expect(() => decryptBankingToken(tamperedCiphertext)).toThrow();
  });

  it("throws error for malformed token format", () => {
    expect(() => decryptBankingToken("not-a-valid-token")).toThrow(
      /Invalid encrypted banking token format/,
    );
  });
});
