import { RECEIPT_MIME_TYPES } from "@flump/api-contract";
import { BadRequestException } from "@nestjs/common";

export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

/** Decoded receipt size cap (5 MB). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_FILENAME_MAX = 255;

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

const hasControlChar = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

export const validateReceiptFilename = (name: unknown): void => {
  if (typeof name !== "string") throw new BadRequestException("Invalid receipt filename");
  if (name.length === 0 || name.length > RECEIPT_FILENAME_MAX) {
    throw new BadRequestException("Invalid receipt filename length");
  }
  if (/[/\\]/.test(name) || name.includes("..") || hasControlChar(name)) {
    throw new BadRequestException("Invalid receipt filename");
  }
};

/**
 * Validates the receipt fields of a tax record write. Null or absent data is
 * allowed (clearing a receipt). Throws 400 on any failure.
 */
export const validateReceipt = (fields: {
  receiptFilename?: unknown;
  receiptMimeType?: unknown;
  receiptData?: unknown;
}): void => {
  const { receiptFilename, receiptMimeType, receiptData } = fields;
  if (receiptFilename !== undefined && receiptFilename !== null) {
    validateReceiptFilename(receiptFilename);
  }
  if (receiptData === undefined || receiptData === null) return;
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
};
