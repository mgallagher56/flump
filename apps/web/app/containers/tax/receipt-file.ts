/** Receipt types the API accepts (mirrors @flump/api-contract RECEIPT_MIME_TYPES). */
export const RECEIPT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;
export const RECEIPT_ACCEPT = RECEIPT_MIME_TYPES.join(",");

/** Decoded size cap enforced by the API (E20-N14). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Client-side pre-check before `readAsDataURL`. The server re-validates, so this
 * only saves a doomed upload.
 */
export const isAcceptableReceiptFile = (file: { name: string; type: string; size: number }) =>
  (RECEIPT_MIME_TYPES as readonly string[]).includes(file.type) &&
  file.size <= RECEIPT_MAX_BYTES &&
  file.name.length > 0 &&
  file.name.length <= 255;
