import { describe, expect, it } from "vitest";
import { isAcceptableReceiptFile, RECEIPT_ACCEPT, RECEIPT_MAX_BYTES } from "./receipt-file";

describe("isAcceptableReceiptFile", () => {
  const ok = { name: "r.pdf", type: "application/pdf", size: 1024 };

  it("accepts allowed types within the size cap", () => {
    expect(isAcceptableReceiptFile(ok)).toBe(true);
    expect(isAcceptableReceiptFile({ ...ok, size: RECEIPT_MAX_BYTES })).toBe(true);
  });

  it("rejects oversize files", () => {
    expect(isAcceptableReceiptFile({ ...ok, size: RECEIPT_MAX_BYTES + 1 })).toBe(false);
  });

  it("rejects disallowed types", () => {
    expect(isAcceptableReceiptFile({ ...ok, type: "image/svg+xml" })).toBe(false);
    expect(isAcceptableReceiptFile({ ...ok, type: "image/gif" })).toBe(false);
  });

  it("rejects over-long names", () => {
    expect(isAcceptableReceiptFile({ ...ok, name: "x".repeat(256) })).toBe(false);
  });

  it("limits the picker to the allowed types", () => {
    expect(RECEIPT_ACCEPT).toBe("image/png,image/jpeg,image/webp,application/pdf");
  });
});
