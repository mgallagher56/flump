import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

const DEFAULT_DEV_KEY = "flump_default_dev_banking_encryption_key_32_bytes!";

/**
 * Derives a consistent 32-byte key from the provided secret or environment variable.
 */
function getDerivedKey(keyOverride?: string): Buffer {
  const secret = keyOverride ?? process.env.BANKING_TOKEN_ENCRYPTION_KEY ?? DEFAULT_DEV_KEY;

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
