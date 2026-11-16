import { decryptReceiptData, encryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { EncryptTaxReceipts1795200000000 } from "./EncryptTaxReceipts1795200000000";

describe("EncryptTaxReceipts1795200000000", () => {
  it("encrypts plaintext receipt_data rows bound to their record id and skips already-encrypted rows", async () => {
    const plainData = "data:image/png;base64,iVBORw0KGgo=";
    const alreadyEncrypted = encryptReceiptData(plainData, "rec-already");
    const updates: Array<{ id: string; receiptData: string }> = [];

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (
        sql.includes("takeMigrationLock") ||
        sql.includes("SET LOCAL") ||
        sql.includes("advisory")
      ) {
        return [];
      }
      if (sql.startsWith('SELECT "id", "receipt_data"')) {
        return [
          { id: "rec-plain", receipt_data: plainData },
          { id: "rec-already", receipt_data: alreadyEncrypted },
        ];
      }
      if (sql.startsWith('UPDATE "tax_records"')) {
        updates.push({ id: params?.[1] as string, receiptData: params?.[0] as string });
        return [];
      }
      return [];
    });

    const migration = new EncryptTaxReceipts1795200000000();
    await migration.up({ query } as unknown as QueryRunner);

    expect(updates).toHaveLength(1);
    expect(updates[0]?.id).toBe("rec-plain");
    expect(isEncryptedToken(updates[0]?.receiptData ?? "")).toBe(true);
    expect(decryptReceiptData(updates[0]?.receiptData ?? "", "rec-plain")).toBe(plainData);
    expect(() => decryptReceiptData(updates[0]?.receiptData ?? "", "rec-other")).toThrow();
  });

  it("is a no-op when no unencrypted receipts exist", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('SELECT "id", "receipt_data"')) return [];
      return [];
    });

    const migration = new EncryptTaxReceipts1795200000000();
    await migration.up({ query } as unknown as QueryRunner);

    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "tax_records"'),
      expect.anything(),
    );
  });
});
