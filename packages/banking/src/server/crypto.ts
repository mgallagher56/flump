import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

const DEFAULT_DEV_KEY = "flump_default_dev_banking_encryption_key_32_bytes!";

const KEY_ENV_VAR = "BANKING_TOKEN_ENCRYPTION_KEY";
const MIN_KEY_LENGTH = 32;

/**
 * Resolves the banking token encryption secret. Outside `development` and `test`
 * (including when NODE_ENV is unset) a key of at least 32 characters is required;
 * otherwise the committed development default is used when the variable is unset.
 * Error messages never include key material.
 */
export function resolveBankingKey(env: Record<string, string | undefined>): string {
  const configured = env[KEY_ENV_VAR];
  const nodeEnv = env.NODE_ENV;
  const strict = nodeEnv !== "development" && nodeEnv !== "test";

  if (!strict) return configured || DEFAULT_DEV_KEY;

  if (!configured || configured.length < MIN_KEY_LENGTH) {
    throw new Error(`${KEY_ENV_VAR} must be set to at least ${MIN_KEY_LENGTH} characters.`);
  }
  return configured;
}

/**
 * Derives a consistent 32-byte key from the provided secret or environment variable.
 */
function getDerivedKey(keyOverride?: string): Buffer {
  const secret = keyOverride ?? resolveBankingKey(process.env);

  // SHA-256 hash guarantees a strict 32-byte key
  return createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  /** Combined format: `${iv}:${tag}:${ciphertext}` */
  packed: string;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 */
export function encryptBankingToken(plaintext: string, keyOverride?: string): string {
  const key = getDerivedKey(keyOverride);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  // Return packed string: iv:tag:ciphertext
  return `${ivHex}:${tag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token formatted as `iv:tag:ciphertext`.
 */
export function decryptBankingToken(packedToken: string, keyOverride?: string): string {
  const parts = packedToken.split(":");
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted banking token format. Expected "iv:tag:ciphertext".');
  }

  const [ivHex, tagHex, ciphertextHex] = parts as [string, string, string];
  const key = getDerivedKey(keyOverride);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Checks whether a string conforms to the `iv:tag:ciphertext` packed format.
 */
export function isEncryptedToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(":");
  return (
    parts.length === 3 &&
    /^[0-9a-f]{24}$/i.test(parts[0]!) &&
    /^[0-9a-f]{32}$/i.test(parts[1]!) &&
    /^[0-9a-f]+$/i.test(parts[2]!)
  );
}

/**
 * Decrypts a banking token, throwing if a non-empty token cannot be decrypted
 * (not in encrypted format, wrong key, or tampered). Empty input is returned unchanged.
 * Errors never include the token, ciphertext or key.
 */
export function safeDecryptBankingToken(token: string, keyOverride?: string): string {
  if (!token) return token;
  if (!isEncryptedToken(token)) {
    throw new Error("Banking token is not in the encrypted format.");
  }

  try {
    return decryptBankingToken(token, keyOverride);
  } catch {
    throw new Error("Failed to decrypt banking token: wrong key or corrupted data.");
  }
}
