import { createCipheriv, createHash, randomBytes } from "node:crypto";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

const VERSIONED_RECEIPT_PATTERN = /^v([1-9][0-9]*):([0-9a-f]{24}):([0-9a-f]{32}):([0-9a-f]+)$/i;
const DEFAULT_DEV_RECEIPT_KEY = "flump_default_dev_receipt_encryption_key_32_bytes!";
const MIN_KEY_LENGTH = 32;

function resolveActiveReceiptKey(env: Record<string, string | undefined>): {
  version: number;
  secret: string;
} {
  const strict =
    (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") || Boolean(env.RAILWAY_ENVIRONMENT);
  const rawKeys = env.RECEIPT_ENCRYPTION_KEYS?.trim();
  if (rawKeys) {
    const first = rawKeys.split(",")[0]?.trim() ?? "";
    const sep = first.indexOf(":");
    const versionText = sep > 0 ? first.slice(0, sep).trim() : "";
    const secret = sep > 0 ? first.slice(sep + 1).trim() : "";
    if (!/^[1-9][0-9]*$/.test(versionText) || !secret) {
      throw new Error("RECEIPT_ENCRYPTION_KEYS entry 1 must be in the form <version>:<secret>.");
    }
    if (strict && secret.length < MIN_KEY_LENGTH) {
      throw new Error(
        `RECEIPT_ENCRYPTION_KEYS version ${versionText} must be at least ${MIN_KEY_LENGTH} characters.`,
      );
    }
    return { version: Number(versionText), secret };
  }

  const configured = env.RECEIPT_ENCRYPTION_KEY;
  if (!strict) return { version: 1, secret: configured || DEFAULT_DEV_RECEIPT_KEY };
  if (!configured || configured.length < MIN_KEY_LENGTH) {
    throw new Error(`RECEIPT_ENCRYPTION_KEY must be set to at least ${MIN_KEY_LENGTH} characters.`);
  }
  return { version: 1, secret: configured };
}

function encryptReceipt(
  plaintext: string,
  recordId: string,
  version: number,
  secret: string,
): string {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(`tax-record:${recordId}:receipt`, "utf8"));
  const ct = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  return `v${version}:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ct}`;
}

/**
 * SEC-D (audit L4): encrypts any existing plaintext `tax_records.receipt_data` blobs using
 * versioned AES-256-GCM bound to the record id via AAD (`tax-record:<id>:receipt`).
 * Uses `node:crypto` directly so TypeORM migration runners work without pre-building workspace
 * packages. Idempotent: rows already in `v<n>:iv:tag:ct` format are skipped.
 */
export class EncryptTaxReceipts1795200000000 implements MigrationInterface {
  name = "EncryptTaxReceipts1795200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    const rows: Array<{ id: string; receipt_data: string }> = await queryRunner.query(
      `SELECT "id", "receipt_data"
         FROM "tax_records"
        WHERE "receipt_data" IS NOT NULL
          AND "receipt_data" !~ '^v[1-9][0-9]*:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$'`,
    );
    if (rows.length === 0) return;

    const { version, secret } = resolveActiveReceiptKey(process.env);
    for (const row of rows) {
      if (VERSIONED_RECEIPT_PATTERN.test(row.receipt_data)) continue;
      const encrypted = encryptReceipt(row.receipt_data, row.id, version, secret);
      await queryRunner.query(`UPDATE "tax_records" SET "receipt_data" = $1 WHERE "id" = $2`, [
        encrypted,
        row.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Intentional no-op: reverting must never downgrade encrypted receipts back to plaintext.
  }
}
