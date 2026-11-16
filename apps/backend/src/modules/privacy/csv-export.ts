const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Protects spreadsheet readers (Excel, Google Sheets, LibreOffice Calc) from CSV formula
 * injection by prefixing any string starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with `'`.
 */
export function sanitizeCsvFormula(value: string): string {
  return CSV_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

/**
 * Formats a single value as an RFC 4180 CSV cell with formula-injection protection.
 * Null/undefined become empty strings; dates become ISO 8601 UTC strings; objects/arrays are
 * JSON-serialised; fields containing quotes, commas, or line breaks are double-quoted with
 * doubled internal quotes.
 */
export function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let raw: string;
  if (value instanceof Date) {
    raw = value.toISOString();
  } else if (typeof value === "string") {
    raw = sanitizeCsvFormula(value);
  } else if (typeof value === "number") {
    raw = Number.isFinite(value) ? String(value) : "";
  } else if (typeof value === "boolean") {
    raw = value ? "true" : "false";
  } else {
    raw = sanitizeCsvFormula(JSON.stringify(value) ?? "");
  }
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

/** Formats one RFC 4180 CSV row terminated with CRLF (`\r\n`). */
export function formatCsvRow(cells: readonly unknown[]): string {
  return `${cells.map(formatCsvCell).join(",")}\r\n`;
}
