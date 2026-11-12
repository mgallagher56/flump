const GROUPED = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?$/;
const DECIMAL_ONLY = /^-?\.\d+$/;
export const ALLOWED_CHARS = /^[\d,.\s£-]*$/;

const display = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Parses what a person types into a money field. Empty, whitespace and anything that is not a
 * well-formed number (including "abc") give `null`, never 0.
 */
export const parseCurrencyInput = (raw: string): number | null => {
  const cleaned = raw.replace(/[£\s]/g, "");
  if (cleaned === "") return null;
  if (!GROUPED.test(cleaned) && !DECIMAL_ONLY.test(cleaned)) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

/** En-GB display text for a parsed amount (grouping, up to two decimals). */
export const formatCurrencyInput = (value: number): string => display.format(value);
