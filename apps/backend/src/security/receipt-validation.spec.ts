import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  RECEIPT_MAX_BYTES,
  sniffReceiptMime,
  validateReceipt,
  validateReceiptFilename,
} from "./receipt-validation";

const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(16)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBP"),
  Buffer.alloc(8),
]);

describe("validateReceipt", () => {
  it("accepts each allowed type with a matching signature", () => {
    for (const [mime, bytes] of [
      ["image/png", PNG],
      ["application/pdf", PDF],
      ["image/jpeg", JPEG],
      ["image/webp", WEBP],
    ] as const) {
      expect(() =>
        validateReceipt({
          receiptFilename: "r.bin",
          receiptMimeType: mime,
          receiptData: dataUrl(mime, bytes),
        }),
      ).not.toThrow();
    }
  });

  it("allows clearing a receipt", () => {
    expect(() => validateReceipt({ receiptData: null, receiptFilename: null })).not.toThrow();
    expect(() => validateReceipt({})).not.toThrow();
  });

  it("rejects text/html and svg", () => {
    expect(() =>
      validateReceipt({ receiptData: dataUrl("text/html", Buffer.from("<script>")) }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateReceipt({ receiptData: dataUrl("image/svg+xml", Buffer.from("<svg/>")) }),
    ).toThrow(BadRequestException);
  });

  it("rejects malformed data URLs", () => {
    expect(() => validateReceipt({ receiptData: "not a data url" })).toThrow(BadRequestException);
    expect(() => validateReceipt({ receiptData: "data:application/pdf,%PDF-" })).toThrow(
      BadRequestException,
    );
    expect(() => validateReceipt({ receiptData: 42 })).toThrow(BadRequestException);
  });

  it("rejects a magic number that mismatches the declared type", () => {
    expect(() => validateReceipt({ receiptData: dataUrl("application/pdf", PNG) })).toThrow(
      BadRequestException,
    );
    expect(() =>
      validateReceipt({ receiptData: dataUrl("image/png", Buffer.from("<html>")) }),
    ).toThrow(BadRequestException);
  });

  it("rejects a declared mime field that differs from the data URL", () => {
    expect(() =>
      validateReceipt({
        receiptMimeType: "image/png",
        receiptData: dataUrl("application/pdf", PDF),
      }),
    ).toThrow(BadRequestException);
  });

  it("rejects a trailing newline in the base64 and a charset parameter", () => {
    expect(() => validateReceipt({ receiptData: `${dataUrl("application/pdf", PDF)}\n` })).toThrow(
      BadRequestException,
    );
    expect(() =>
      validateReceipt({
        receiptData: `data:application/pdf;charset=utf-8;base64,${PDF.toString("base64")}`,
      }),
    ).toThrow(BadRequestException);
  });

  it("accepts an uppercase MIME and returns it lowercased", () => {
    expect(validateReceipt({ receiptData: dataUrl("APPLICATION/PDF", PDF) })).toBe(
      "application/pdf",
    );
    expect(validateReceipt({ receiptData: null })).toBeNull();
  });

  it("enforces the 5 MB decoded limit", () => {
    const six = Buffer.concat([PDF, Buffer.alloc(6 * 1024 * 1024)]);
    expect(() => validateReceipt({ receiptData: dataUrl("application/pdf", six) })).toThrow(/5 MB/);
    const four = Buffer.concat([PDF, Buffer.alloc(4 * 1024 * 1024)]);
    expect(() => validateReceipt({ receiptData: dataUrl("application/pdf", four) })).not.toThrow();
    const edge = Buffer.concat([PDF, Buffer.alloc(RECEIPT_MAX_BYTES - PDF.length)]);
    expect(() => validateReceipt({ receiptData: dataUrl("application/pdf", edge) })).not.toThrow();
    const over = Buffer.concat([PDF, Buffer.alloc(RECEIPT_MAX_BYTES - PDF.length + 1)]);
    expect(() => validateReceipt({ receiptData: dataUrl("application/pdf", over) })).toThrow(
      /5 MB/,
    );
  });
});

describe("validateReceiptFilename", () => {
  it("accepts ordinary names", () => {
    expect(() => validateReceiptFilename("Receipt 2025 (1).pdf")).not.toThrow();
  });
  it.each([
    "../x.pdf",
    "a/b.pdf",
    "a\\b.pdf",
    "a\u0000b.pdf",
    "a\nb.pdf",
    "a\u202eb.exe",
    "a\u200bb.pdf",
    "a\u0085b.pdf",
    "\ufeffa.pdf",
    "..",
    ". .",
    "",
    "x".repeat(256),
  ])("rejects %j", (name) => {
    expect(() => validateReceiptFilename(name)).toThrow(BadRequestException);
  });
  it("allows dots inside a name", () => {
    expect(() => validateReceiptFilename("Receipt..pdf")).not.toThrow();
  });
  it("accepts a 255 character name", () => {
    expect(() => validateReceiptFilename("x".repeat(255))).not.toThrow();
  });
});

describe("sniffReceiptMime", () => {
  it("returns null for unknown content", () => {
    expect(sniffReceiptMime(Buffer.from("hello"))).toBeNull();
  });
});
