import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  type BankingKeyring,
  bankingTokenNeedsReencrypt,
  decryptBankingToken,
  encryptBankingToken,
  isEncryptedToken,
  keyringFromSecret,
  resolveBankingKey,
  resolveBankingKeyring,
  safeDecryptBankingToken,
} from "./crypto.js";

const KEY_A = "a".repeat(32);
const KEY_B = "b".repeat(32);
const RING_A = keyringFromSecret(KEY_A);
const RING_B = keyringFromSecret(KEY_B);

/** Builds a legacy (unprefixed `iv:tag:ct`) token directly with node:crypto. */
function legacyEncrypt(plaintext: string, secret: string): string {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ct = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ct}`;
}

function messageOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected function to throw");
}

describe("banking server: crypto (AES-256-GCM)", () => {
  it("round trips in the versioned format", () => {
    const rawToken = "access-sandbox-9b8132-monzo-open-banking-token-secret-12345";
    const encrypted = encryptBankingToken(rawToken, { keyring: RING_A });

    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(parts[1]?.length).toBe(24); // 12 bytes
    expect(parts[2]?.length).toBe(32); // 16 bytes
    expect(isEncryptedToken(encrypted)).toBe(true);

    expect(decryptBankingToken(encrypted, { keyring: RING_A })).toBe(rawToken);
  });

  it("round trips with the default keyring from process.env", () => {
    const enc = encryptBankingToken("tok-default");
    expect(safeDecryptBankingToken(enc)).toBe("tok-default");
  });

  it("fails decryption with tampered ciphertext", () => {
    const encrypted = encryptBankingToken("super-secret-token", { keyring: RING_A });
    const tampered = `${encrypted.slice(0, -2)}${encrypted.endsWith("ff") ? "00" : "ff"}`;
    expect(() => decryptBankingToken(tampered, { keyring: RING_A })).toThrow();
  });

  it("throws for malformed token format", () => {
    expect(() => decryptBankingToken("not-a-valid-token", { keyring: RING_A })).toThrow(
      /Invalid encrypted banking token format/,
    );
  });

  it("binds associated data: matching AAD decrypts, mismatched or missing AAD fails", () => {
    const enc = encryptBankingToken("tok-aad", { keyring: RING_A, aad: "conn-1:accessToken" });
    expect(safeDecryptBankingToken(enc, { keyring: RING_A, aad: "conn-1:accessToken" })).toBe(
      "tok-aad",
    );
    expect(() =>
      safeDecryptBankingToken(enc, { keyring: RING_A, aad: "conn-2:accessToken" }),
    ).toThrow(/wrong key or corrupted data/);
    expect(() => safeDecryptBankingToken(enc, { keyring: RING_A })).toThrow();
  });

  it("still decrypts legacy unprefixed tokens with the version-1 key, ignoring AAD", () => {
    const legacy = legacyEncrypt("legacy-tok", KEY_A);
    expect(isEncryptedToken(legacy)).toBe(true);
    expect(decryptBankingToken(legacy, { keyring: RING_A })).toBe("legacy-tok");
    expect(safeDecryptBankingToken(legacy, { keyring: RING_A, aad: "conn-1:accessToken" })).toBe(
      "legacy-tok",
    );
    expect(bankingTokenNeedsReencrypt(legacy, RING_A)).toBe(true);
  });

  it("rotates: old v1 tokens decrypt under a ring whose active key is v2", () => {
    const enc1 = encryptBankingToken("tok-rotate", { keyring: RING_A, aad: "x" });
    const rotated: BankingKeyring = {
      activeVersion: 2,
      keys: new Map([
        [2, KEY_B],
        [1, KEY_A],
      ]),
    };

    expect(bankingTokenNeedsReencrypt(enc1, RING_A)).toBe(false);
    expect(bankingTokenNeedsReencrypt(enc1, rotated)).toBe(true);
    const plain = safeDecryptBankingToken(enc1, { keyring: rotated, aad: "x" });
    expect(plain).toBe("tok-rotate");

    const enc2 = encryptBankingToken(plain, { keyring: rotated, aad: "x" });
    expect(enc2.startsWith("v2:")).toBe(true);
    expect(bankingTokenNeedsReencrypt(enc2, rotated)).toBe(false);
    expect(safeDecryptBankingToken(enc2, { keyring: rotated, aad: "x" })).toBe("tok-rotate");
  });

  it("fails on a key version that is not in the keyring", () => {
    const enc = encryptBankingToken("tok", { keyring: keyringFromSecret(KEY_B, 3) });
    expect(() => decryptBankingToken(enc, { keyring: RING_A })).toThrow(/version 3/);
    expect(() => safeDecryptBankingToken(enc, { keyring: RING_A })).toThrow(/version 3/);
  });

  it("does not flag non-encrypted input for re-encryption", () => {
    expect(bankingTokenNeedsReencrypt("plaintext", RING_A)).toBe(false);
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
    const message = messageOf(() =>
      resolveBankingKey({ NODE_ENV: "production", BANKING_TOKEN_ENCRYPTION_KEY: short }),
    );
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

describe("resolveBankingKeyring", () => {
  it("falls back to the single key as version 1 when KEYS is unset or empty", () => {
    for (const keys of [undefined, "", "   "]) {
      const ring = resolveBankingKeyring({
        NODE_ENV: "production",
        BANKING_TOKEN_ENCRYPTION_KEY: KEY_A,
        BANKING_TOKEN_ENCRYPTION_KEYS: keys,
      });
      expect(ring.activeVersion).toBe(1);
      expect(ring.keys.get(1)).toBe(KEY_A);
      expect(ring.keys.size).toBe(1);
    }
  });

  it("parses versioned entries with the first as active", () => {
    const ring = resolveBankingKeyring({
      NODE_ENV: "production",
      BANKING_TOKEN_ENCRYPTION_KEYS: `2:${KEY_B}, 1:${KEY_A}`,
    });
    expect(ring.activeVersion).toBe(2);
    expect(ring.keys.get(2)).toBe(KEY_B);
    expect(ring.keys.get(1)).toBe(KEY_A);
  });

  it.each([
    ["missing separator", KEY_A],
    ["non-numeric version", `x:${KEY_A}`],
    ["zero version", `0:${KEY_A}`],
    ["negative version", `-1:${KEY_A}`],
    ["empty secret", "1:"],
    ["duplicate version", `1:${KEY_A},1:${KEY_B}`],
    ["empty entry", `1:${KEY_A},`],
  ])("rejects a malformed entry (%s) naming the variable without leaking keys", (_, value) => {
    const message = messageOf(() =>
      resolveBankingKeyring({ NODE_ENV: "test", BANKING_TOKEN_ENCRYPTION_KEYS: value }),
    );
    expect(message).toMatch(/BANKING_TOKEN_ENCRYPTION_KEYS/);
    expect(message).not.toContain(KEY_A);
    expect(message).not.toContain(KEY_B);
  });

  it("rejects a short secret in strict mode without leaking it", () => {
    const short = "short-secret-value";
    const message = messageOf(() =>
      resolveBankingKeyring({
        NODE_ENV: "production",
        BANKING_TOKEN_ENCRYPTION_KEYS: `2:${short},1:${KEY_A}`,
      }),
    );
    expect(message).toMatch(/BANKING_TOKEN_ENCRYPTION_KEYS/);
    expect(message).not.toContain(short);
    expect(message).not.toContain(KEY_A);
  });

  it("accepts a short secret outside strict mode", () => {
    const ring = resolveBankingKeyring({
      NODE_ENV: "development",
      BANKING_TOKEN_ENCRYPTION_KEYS: "1:dev",
    });
    expect(ring.keys.get(1)).toBe("dev");
  });
});

describe("strict decrypt", () => {
  it("throws under a different key without returning the ciphertext", () => {
    const enc = encryptBankingToken("tok-123", { keyring: RING_A });
    expect(() => decryptBankingToken(enc, { keyring: RING_B })).toThrow();
    expect(() => safeDecryptBankingToken(enc, { keyring: RING_B })).toThrow();
  });

  it("throws on non-encrypted input without echoing it", () => {
    const message = messageOf(() => safeDecryptBankingToken("plaintext-token"));
    expect(message).not.toContain("plaintext-token");
  });

  it("never puts key material, plaintext or ciphertext in error messages", () => {
    const plaintext = "very-secret-plaintext-token";
    const enc = encryptBankingToken(plaintext, { keyring: RING_A, aad: "a" });
    const tampered = `${enc.slice(0, -2)}${enc.endsWith("ff") ? "00" : "ff"}`;
    const messages = [
      messageOf(() => safeDecryptBankingToken(enc, { keyring: RING_B, aad: "a" })),
      messageOf(() => safeDecryptBankingToken(enc, { keyring: RING_A, aad: "b" })),
      messageOf(() => safeDecryptBankingToken(tampered, { keyring: RING_A, aad: "a" })),
      messageOf(() => safeDecryptBankingToken(enc, { keyring: keyringFromSecret(KEY_A, 9) })),
    ];
    for (const message of messages) {
      expect(message).not.toContain(plaintext);
      expect(message).not.toContain(KEY_A);
      expect(message).not.toContain(KEY_B);
      expect(message).not.toContain(enc);
      expect(message).not.toContain(tampered);
    }
  });

  it("returns empty input unchanged", () => {
    expect(safeDecryptBankingToken("")).toBe("");
  });
});
