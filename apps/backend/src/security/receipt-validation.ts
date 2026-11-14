import { RECEIPT_MIME_TYPES } from "@flump/api-contract";
import { BadRequestException } from "@nestjs/common";

export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

/** Decoded receipt size cap (5 MB). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_FILENAME_MAX = 255;

const DATA_URL = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/;

const hasPrefix = (bytes: Buffer, prefix: number[], offset = 0): boolean =>
  bytes.length >= offset + prefix.length && prefix.every((b, i) => bytes[offset + i] === b);

const SNIFFERS: Record<ReceiptMimeType, (b: Buffer) => boolean> = {
  "image/png": (b) => hasPrefix(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (b) => hasPrefix(b, [0xff, 0xd8, 0xff]),
  "image/webp": (b) =>
    hasPrefix(b, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(b, [0x57, 0x45, 0x42, 0x50], 8),
  "application/pdf": (b) => hasPrefix(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
};

const isAllowedMime = (mime: string): mime is ReceiptMimeType =>
  (RECEIPT_MIME_TYPES as readonly string[]).includes(mime);

/** Identify an allowed receipt type from its leading bytes, or null. */
export const sniffReceiptMime = (bytes: Buffer): ReceiptMimeType | null =>
  RECEIPT_MIME_TYPES.find((mime) => SNIFFERS[mime](bytes)) ?? null;

// C0/C1 controls, zero-width and bidi formatting characters, BOM.
const FORBIDDEN_RANGES: [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

const hasForbiddenNameChar = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (FORBIDDEN_RANGES.some(([lo, hi]) => code >= lo && code <= hi)) return true;
  }
  return false;
};

export const validateReceiptFilename = (name: unknown): void => {
  if (typeof name !== "string") throw new BadRequestException("Invalid receipt filename");
  if (name.length === 0 || name.length > RECEIPT_FILENAME_MAX) {
    throw new BadRequestException("Invalid receipt filename length");
  }
  // Separators are rejected, so "Receipt..pdf" is harmless; names made only of
  // dots and spaces ("..", ". .") are not real filenames.
  if (/[/\\]/.test(name) || hasForbiddenNameChar(name) || /^[. ]+$/.test(name)) {
    throw new BadRequestException("Invalid receipt filename");
  }
};

/**
 * Validates the receipt fields of a tax record write. Null or absent data is
 * allowed (clearing a receipt). Throws 400 on any failure. Returns the validated,
 * lowercased MIME type when data is present, otherwise null.
 */
export const validateReceipt = (fields: {
  receiptFilename?: unknown;
  receiptMimeType?: unknown;
  receiptData?: unknown;
}): ReceiptMimeType | null => {
  const { receiptFilename, receiptMimeType, receiptData } = fields;
  if (receiptFilename !== undefined && receiptFilename !== null) {
    validateReceiptFilename(receiptFilename);
  }
  if (receiptData === undefined || receiptData === null) return null;
  if (typeof receiptData !== "string") throw new BadRequestException("Invalid receipt data");

  const match = DATA_URL.exec(receiptData);
  if (!match) throw new BadRequestException("Receipt must be a base64 data URL");
  const declared = (match[1] ?? "").toLowerCase();
  const base64 = match[2] ?? "";
  if (!isAllowedMime(declared)) throw new BadRequestException("Unsupported receipt type");
  if (receiptMimeType !== undefined && receiptMimeType !== null && receiptMimeType !== declared) {
    throw new BadRequestException("Receipt type does not match its data");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedSize = Math.floor((base64.length * 3) / 4) - padding;
  if (decodedSize > RECEIPT_MAX_BYTES) throw new BadRequestException("Receipt is larger than 5 MB");

  const bytes = Buffer.from(base64, "base64");
  if (sniffReceiptMime(bytes) !== declared) {
    throw new BadRequestException("Receipt content does not match its declared type");
  }
  return declared;
};
