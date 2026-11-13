import { formatNumber } from "../Money/Money";

const GROUPED = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?$/;
const DECIMAL_ONLY = /^-?\.\d+$/;
export const ALLOWED_CHARS = /^[\d,.\s£%-]*$/;
/** Per-field allowed characters: a money field takes £ only, a percentage field % only. */
export const MONEY_CHARS = /^[\d,.\s£-]*$/;
export const PERCENT_CHARS = /^[\d,.\s%-]*$/;

/**
 * Parses what a person types into a number field, en-GB style: "1,250.50", "£1,250", "4.5%" and
 * " 12 " all parse. Empty, whitespace and anything that is not a well-formed number (including
 * "abc" and "1.2.3") give `null`, never 0.
 */
export const parseEnGbNumber = (raw: string, symbols = "£%"): number | null => {
  const cleaned = raw.replace(new RegExp(`[${symbols}\\s]`, "g"), "");
  if (cleaned === "") return null;
  if (!GROUPED.test(cleaned) && !DECIMAL_ONLY.test(cleaned)) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER) return null;
  return parsed === 0 ? 0 : parsed;
};

/** Parses a money field. Same rules as {@link parseEnGbNumber}. */
export const parseCurrencyInput = (raw: string): number | null => parseEnGbNumber(raw, "£");

/** Rounds to whole pence and removes negative zero, so "-0" and "-0.001" become 0. */
export const roundToPennies = (value: number): number => {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
};

/** Rounds to `decimals` places and removes negative zero. */
export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
};

/**
 * En-GB display text for a number (grouping, up to `maxDecimals` decimals, no trailing zeros).
 * NaN and the infinities give an empty string. Built on `formatNumber` from the Money primitive.
 */
export const formatEnGbNumber = (value: number, maxDecimals = 2): string => {
  if (!Number.isFinite(value)) return "";
  const rounded = roundToDecimals(value, maxDecimals);
  const decimals = Math.min(maxDecimals, String(rounded).split(".")[1]?.length ?? 0);
  return formatNumber(rounded, { fractionDigits: decimals }).text;
};

/**
 * En-GB display text for an amount (grouping, up to two decimals). NaN and the infinities give an
 * empty string; -0 and sub-penny values show as 0.
 */
export const formatCurrencyInput = (value: number): string => formatEnGbNumber(value, 2);
