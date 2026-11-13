import { describe, expect, it } from "vitest";
import {
  DeleteTaxRecordResponse,
  TaxRecordListResponse,
  TaxRecordResponse,
} from "./domains/tax.js";
import { checkAgainst } from "./validate.js";

/** A tax_records row as toResponse sends it: no receiptData, `hasReceipt` added. */
const record = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  userId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  type: "income",
  source: "rental",
  category: "rental_income",
  name: "Flat rent (2025/26)",
  amount: 1250.5,
  frequency: "annual",
  date: "2025-04-06",
  endDate: "2026-04-05",
  notes: null,
  receiptFilename: "statement.pdf",
  receiptMimeType: "application/pdf",
  hasReceipt: true,
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-11T08:30:00.000Z",
};

const bare = {
  ...record,
  frequency: "one-off",
  endDate: null,
  receiptFilename: null,
  receiptMimeType: null,
  hasReceipt: false,
};

describe("tax response schemas", () => {
  it("accepts a record with and without a receipt, and a list", () => {
    expect(checkAgainst(TaxRecordResponse, record)).toEqual({ ok: true });
    expect(checkAgainst(TaxRecordResponse, bare)).toEqual({ ok: true });
    expect(checkAgainst(TaxRecordListResponse, [record, bare])).toEqual({ ok: true });
  });

  it("rejects the receipt bytes leaking into a record", () => {
    expect(
      checkAgainst(TaxRecordResponse, { ...record, receiptData: "data:application/pdf;base64,AA" })
        .ok,
    ).toBe(false);
  });

  it("rejects a decimal amount as a string in a list item", () => {
    expect(checkAgainst(TaxRecordListResponse, [{ ...record, amount: "1250.50" }]).ok).toBe(false);
  });

  it("rejects a missing nullable key (create must send null, not drop it)", () => {
    const { notes: _notes, ...withoutNotes } = bare;
    expect(checkAgainst(TaxRecordResponse, withoutNotes).ok).toBe(false);
  });

  it("accepts the delete body and rejects an extra key", () => {
    expect(checkAgainst(DeleteTaxRecordResponse, { success: true })).toEqual({ ok: true });
    expect(checkAgainst(DeleteTaxRecordResponse, { success: true, id: "x" }).ok).toBe(false);
  });
});
