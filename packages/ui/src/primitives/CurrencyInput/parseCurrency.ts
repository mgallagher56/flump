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

/** Rounds to whole pence and removes negative zero, so "-0" and "-0.001" become 0. */
export const roundToPennies = (value: number): number => {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
};

/**
 * En-GB display text for an amount (grouping, up to two decimals). NaN and the infinities give an
 * empty string; -0 and sub-penny values show as 0.
 */
export const formatCurrencyInput = (value: number): string =>
  Number.isFinite(value) ? display.format(roundToPennies(value)) : "";
