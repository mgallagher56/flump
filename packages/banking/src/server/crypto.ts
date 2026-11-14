import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

const DEFAULT_DEV_KEY = "flump_default_dev_banking_encryption_key_32_bytes!";

const KEY_ENV_VAR = "BANKING_TOKEN_ENCRYPTION_KEY";
const KEYS_ENV_VAR = "BANKING_TOKEN_ENCRYPTION_KEYS";
const MIN_KEY_LENGTH = 32;

/** Legacy version: unprefixed `iv:tag:ct` tokens are read with this key, without AAD. */
const LEGACY_KEY_VERSION = 1;

const LEGACY_TOKEN_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;
const VERSIONED_TOKEN_PATTERN = /^v([1-9][0-9]*):([0-9a-f]{24}):([0-9a-f]{32}):([0-9a-f]+)$/i;

function isStrictEnv(env: Record<string, string | undefined>): boolean {
  const nodeEnv = env.NODE_ENV;
  return nodeEnv !== "development" && nodeEnv !== "test";
}

/**
 * Resolves the banking token encryption secret. Outside `development` and `test`
 * (including when NODE_ENV is unset) a key of at least 32 characters is required;
 * otherwise the committed development default is used when the variable is unset.
 * Error messages never include key material.
 */
export function resolveBankingKey(env: Record<string, string | undefined>): string {
  const configured = env[KEY_ENV_VAR];
  const strict = isStrictEnv(env);

  if (!strict) return configured || DEFAULT_DEV_KEY;

  if (!configured || configured.length < MIN_KEY_LENGTH) {
    throw new Error(`${KEY_ENV_VAR} must be set to at least ${MIN_KEY_LENGTH} characters.`);
  }
  return configured;
}

/** A set of versioned secrets. `activeVersion` encrypts; every version in `keys` can decrypt. */
export interface BankingKeyring {
  activeVersion: number;
  keys: ReadonlyMap<number, string>;
}

/** Builds a single-key keyring. Intended for tests and callers holding one secret. */
export function keyringFromSecret(secret: string, version = 1): BankingKeyring {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Banking key version must be a positive integer.");
  }
  return { activeVersion: version, keys: new Map([[version, secret]]) };
}

/**
 * Resolves the banking keyring. `BANKING_TOKEN_ENCRYPTION_KEYS` is an optional comma-separated
 * list of `<version>:<secret>` entries; the first entry is the active (encrypting) key. When it is
 * unset or empty, the keyring holds `resolveBankingKey(env)` as version 1. In strict mode every
 * secret must be at least 32 characters. Error messages never include key material.
 */
export function resolveBankingKeyring(env: Record<string, string | undefined>): BankingKeyring {
  const raw = env[KEYS_ENV_VAR]?.trim();
  if (!raw) return keyringFromSecret(resolveBankingKey(env), LEGACY_KEY_VERSION);

  const strict = isStrictEnv(env);
  const keys = new Map<number, string>();
  let activeVersion: number | undefined;

  const entries = raw.split(",");
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!.trim();
    const position = i + 1;
    const sep = entry.indexOf(":");
    if (sep <= 0) {
      throw new Error(`${KEYS_ENV_VAR} entry ${position} must be in the form <version>:<secret>.`);
    }
    const versionText = entry.slice(0, sep).trim();
    const secret = entry.slice(sep + 1).trim();
    if (!/^[1-9][0-9]*$/.test(versionText)) {
      throw new Error(
        `${KEYS_ENV_VAR} entry ${position} must start with a positive integer version.`,
      );
    }
    const version = Number(versionText);
    if (!Number.isSafeInteger(version)) {
      throw new Error(`${KEYS_ENV_VAR} entry ${position} has a version that is too large.`);
    }
    if (!secret) {
      throw new Error(`${KEYS_ENV_VAR} entry ${position} has an empty secret.`);
    }
    if (keys.has(version)) {
      throw new Error(`${KEYS_ENV_VAR} lists version ${version} more than once.`);
    }
    if (strict && secret.length < MIN_KEY_LENGTH) {
      throw new Error(
        `${KEYS_ENV_VAR} version ${version} must be at least ${MIN_KEY_LENGTH} characters.`,
      );
    }
    keys.set(version, secret);
    activeVersion ??= version;
  }

  return { activeVersion: activeVersion!, keys };
}

function deriveKey(secret: string): Buffer {
  // SHA-256 guarantees a strict 32-byte key.
  return createHash("sha256").update(secret).digest();
}

function keyForVersion(keyring: BankingKeyring, version: number): Buffer {
  const secret = keyring.keys.get(version);
  if (!secret) {
    throw new Error(`No banking token key is configured for version ${version}.`);
  }
  return deriveKey(secret);
}

export interface BankingCryptoOptions {
  /** Associated data bound to the ciphertext (for example a connection id and field name). */
  aad?: string;
  /** Keyring to use. Defaults to `resolveBankingKeyring(process.env)`. */
  keyring?: BankingKeyring;
}

interface ParsedToken {
  version: number;
  legacy: boolean;
  ivHex: string;
  tagHex: string;
  ctHex: string;
}

function parseToken(token: string): ParsedToken | null {
  if (!token || typeof token !== "string") return null;
  const v = VERSIONED_TOKEN_PATTERN.exec(token);
  if (v) {
    return {
      version: Number(v[1]),
      legacy: false,
      ivHex: v[2]!,
      tagHex: v[3]!,
      ctHex: v[4]!,
    };
  }
  if (LEGACY_TOKEN_PATTERN.test(token)) {
    const [ivHex, tagHex, ctHex] = token.split(":") as [string, string, string];
    return { version: LEGACY_KEY_VERSION, legacy: true, ivHex, tagHex, ctHex };
  }
  return null;
}

/**
 * Encrypts a plaintext string with AES-256-GCM under the active key, returning
 * `v<version>:<ivHex>:<tagHex>:<ctHex>`. When `aad` is given it must be supplied again to decrypt.
 */
export function encryptBankingToken(plaintext: string, options: BankingCryptoOptions = {}): string {
  const keyring = options.keyring ?? resolveBankingKeyring(process.env);
  const version = keyring.activeVersion;
  const key = keyForVersion(keyring, version);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  if (options.aad !== undefined) cipher.setAAD(Buffer.from(options.aad, "utf8"));

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return `v${version}:${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Decrypts a token in the versioned format, or the legacy `iv:tag:ciphertext` format (read with
 * the version-1 key and no AAD). Throws on a malformed token, an unknown key version, a wrong
 * key, mismatched AAD or tampering.
 */
export function decryptBankingToken(token: string, options: BankingCryptoOptions = {}): string {
  const parsed = parseToken(token);
  if (!parsed) {
    throw new Error(
      'Invalid encrypted banking token format. Expected "v<version>:iv:tag:ciphertext".',
    );
  }

  const keyring = options.keyring ?? resolveBankingKeyring(process.env);
  const key = keyForVersion(keyring, parsed.version);
  const iv = Buffer.from(parsed.ivHex, "hex");
  const tag = Buffer.from(parsed.tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  if (!parsed.legacy && options.aad !== undefined) {
    decipher.setAAD(Buffer.from(options.aad, "utf8"));
  }
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(parsed.ctHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** Checks whether a string is in the versioned or the legacy encrypted format. */
export function isEncryptedToken(token: string): boolean {
  return parseToken(token) !== null;
}

/**
 * True when an encrypted token should be re-encrypted: it is in the legacy format or was written
 * under a key version that is not the active one. Non-encrypted input returns false.
 */
export function bankingTokenNeedsReencrypt(token: string, keyring?: BankingKeyring): boolean {
  const parsed = parseToken(token);
  if (!parsed) return false;
  if (parsed.legacy) return true;
  const ring = keyring ?? resolveBankingKeyring(process.env);
  return parsed.version !== ring.activeVersion;
}

/**
 * Decrypts a banking token, throwing if a non-empty token cannot be decrypted
 * (not in encrypted format, unknown key version, wrong key, wrong AAD or tampered). Empty input
 * is returned unchanged. Errors never include the token, ciphertext, plaintext or key.
 */
export function safeDecryptBankingToken(token: string, options: BankingCryptoOptions = {}): string {
  if (!token) return token;
  const parsed = parseToken(token);
  if (!parsed) {
    throw new Error("Banking token is not in the encrypted format.");
  }

  const keyring = options.keyring ?? resolveBankingKeyring(process.env);
  if (!keyring.keys.has(parsed.version)) {
    throw new Error(
      `Failed to decrypt banking token: key version ${parsed.version} is not configured.`,
    );
  }

  try {
    return decryptBankingToken(token, { ...options, keyring });
  } catch {
    throw new Error("Failed to decrypt banking token: wrong key or corrupted data.");
  }
}
