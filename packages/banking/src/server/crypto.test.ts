import { describe, expect, it } from "vitest";
import {
  decryptBankingToken,
  encryptBankingToken,
  resolveBankingKey,
  safeDecryptBankingToken,
} from "./crypto.js";

const KEY_A = "a".repeat(32);
const KEY_B = "b".repeat(32);

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

describe("resolveBankingKey", () => {
  it("throws naming the variable in production", () => {
    expect(() => resolveBankingKey({ NODE_ENV: "production" })).toThrow(
      /BANKING_TOKEN_ENCRYPTION_KEY/,
    );
  });

  it("throws when NODE_ENV is unset", () => {
    expect(() => resolveBankingKey({})).toThrow(/BANKING_TOKEN_ENCRYPTION_KEY/);
  });

  it("throws for a 31-character key without leaking it", () => {
    const short = "s3cretShortKeyValue_0123456789x".slice(0, 31);
    expect(short.length).toBe(31);
    let message = "";
    try {
      resolveBankingKey({ NODE_ENV: "production", BANKING_TOKEN_ENCRYPTION_KEY: short });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/BANKING_TOKEN_ENCRYPTION_KEY/);
    expect(message).not.toContain(short);
  });

  it("returns a 32-character key in production", () => {
    expect(resolveBankingKey({ NODE_ENV: "production", BANKING_TOKEN_ENCRYPTION_KEY: KEY_A })).toBe(
      KEY_A,
    );
  });

  it.each(["development", "test"])("returns the default when unset in %s", (NODE_ENV) => {
    const key = resolveBankingKey({ NODE_ENV });
    expect(key.length).toBeGreaterThanOrEqual(32);
  });

  it.each(["development", "test"])("returns the variable when set in %s", (NODE_ENV) => {
    expect(resolveBankingKey({ NODE_ENV, BANKING_TOKEN_ENCRYPTION_KEY: "short" })).toBe("short");
  });
});

describe("strict decrypt", () => {
  it("round trips with a supplied key", () => {
    const enc = encryptBankingToken("tok-123", KEY_A);
    expect(safeDecryptBankingToken(enc, KEY_A)).toBe("tok-123");
  });

  it("throws under a different key without returning the ciphertext", () => {
    const enc = encryptBankingToken("tok-123", KEY_A);
    expect(() => decryptBankingToken(enc, KEY_B)).toThrow();
    expect(() => safeDecryptBankingToken(enc, KEY_B)).toThrow();
  });

  it("throws on non-encrypted input without echoing it", () => {
    expect(() => safeDecryptBankingToken("plaintext-token")).toThrow();
    try {
      safeDecryptBankingToken("plaintext-token");
    } catch (e) {
      expect((e as Error).message).not.toContain("plaintext-token");
    }
  });

  it("throws on tampered ciphertext without leaking it", () => {
    const enc = encryptBankingToken("tok-123", KEY_A);
    const parts = enc.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]?.slice(0, -2)}ff`;
    expect(() => safeDecryptBankingToken(tampered, KEY_A)).toThrow();
    try {
      safeDecryptBankingToken(tampered, KEY_A);
    } catch (e) {
      expect((e as Error).message).not.toContain(tampered);
    }
  });

  it("returns empty input unchanged", () => {
    expect(safeDecryptBankingToken("")).toBe("");
  });
});
