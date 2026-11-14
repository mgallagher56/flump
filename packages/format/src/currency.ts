/**
 * Currency, percent and speech formatting. en-GB only; Hermes-safe Intl (no compact notation).
 *
 * Output matches what the web shows today through `Money` / `Num` in `@repo/ui` (pinned by
 * packages/ui/src/format.parity.test.ts): whole pounds by default, the ASCII hyphen-minus as the
 * visible sign (screen readers get "minus" from the spoken form), compact k / m / bn / tn, and an
 * invalid currency code falls back to GBP. E12 section 12.4 supersedes T1.13's true minus and
 * two-decimal default, which would have differed from the web.
 */

const LOCALE = "en-GB";
const MINUS = "-";

export const DEFAULT_PLACEHOLDER = "Not set";

export interface FormatOptions {
  /** Shown for null, undefined, NaN and +/-Infinity. Default "Not set". */
  placeholder?: string;
}

export interface FormatCurrencyOptions extends FormatOptions {
  /** Abbreviate large values (£1.5k, £2.3m, £1.1bn) with at most one decimal. */
  compact?: boolean;
  /** 0 (whole pounds, the default: a figure that is read) or 2 (pence, where it is typed or reconciled). */
  fractionDigits?: 0 | 2;
}

export interface FormatPercentOptions extends FormatOptions {
  /** Fixed fraction digits, as `Num kind="percent"`. Default 0. */
  fractionDigits?: number;
  /** Treat the input as a fraction (0.045 -> 4.5%). Default false. */
  fraction?: boolean;
}

export function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const MAX_CACHED_FORMATTERS = 50;
const formatterCache = new Map<string, Intl.NumberFormat>();

function cached(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  let f = formatterCache.get(key);
  if (!f) {
    // Bound memory: keys include caller-supplied currency codes.
    if (formatterCache.size >= MAX_CACHED_FORMATTERS) formatterCache.clear();
    f = make();
    formatterCache.set(key, f);
  }
  return f;
}

function plainNumber(abs: number, minFraction: number, maxFraction: number): string {
  return cached(
    `n:${minFraction}:${maxFraction}`,
    () =>
      new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction,
      }),
  ).format(abs);
}

function currencyFormat(currency: string, digits: number): Intl.NumberFormat {
  return cached(
    `c:${currency}:${digits}`,
    () =>
      new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
  );
}

/** An invalid ISO 4217 code makes Intl throw; fall back to GBP, as `Money` does. */
function safeCurrency(code: string): string {
  try {
    currencyFormat(code, 0);
    return code;
  } catch {
    return "GBP";
  }
}

/** Round to the display precision; anything that rounds to zero is unsigned ("-£0" never shows). */
function normalise(value: number, digits: number): { abs: number; sign: string } {
  const factor = 10 ** digits;
  const abs = Math.round(Math.abs(value) * factor) / factor;
  return { abs, sign: value < 0 && abs !== 0 ? MINUS : "" };
}

const COMPACT_UNITS: Array<[number, string]> = [
  [1e12, "tn"],
  [1e9, "bn"],
  [1e6, "m"],
  [1e3, "k"],
];

/** Scale to the largest unit, one decimal at most; rounding can tip into the next unit. */
function compactParts(abs: number): { scaled: number; suffix: string } {
  const rounded = Math.round(abs * 10) / 10;
  for (let i = 0; i < COMPACT_UNITS.length; i++) {
    const [size, suffix] = COMPACT_UNITS[i] as [number, string];
    if (rounded < size) continue;
    const scaled = Math.round((abs / size) * 10) / 10;
    const next = COMPACT_UNITS[i - 1];
    // 999,950 -> 1,000k -> 1m.
    if (next && scaled * size >= next[0])
      return { scaled: (scaled * size) / next[0], suffix: next[1] };
    return { scaled, suffix };
  }
  return { scaled: rounded, suffix: "" };
}

/**
 * Format a monetary value: £1,234 by default, £1,234.50 with `fractionDigits: 2`. 0 renders as £0;
 * null, undefined, NaN and Infinity render as the placeholder (never £0).
 */
export function formatCurrency(
  value: number | null | undefined,
  currencyCode = "GBP",
  options: FormatCurrencyOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER, compact = false, fractionDigits = 0 } = options;
  if (!isFiniteNumber(value)) return placeholder;
  const currency = safeCurrency(currencyCode || "GBP");

  if (compact) {
    const { scaled, suffix } = compactParts(Math.abs(value));
    const sign = value < 0 && scaled !== 0 ? MINUS : "";
    // The symbol (and any spacing) is whatever Intl prints before the digits.
    const prefix = currencyFormat(currency, 0)
      .format(0)
      .replace(/[\d.,]/g, "");
    return `${sign}${prefix}${plainNumber(scaled, 0, 1)}${suffix}`;
  }

  const { abs, sign } = normalise(value, fractionDigits);
  return `${sign}${currencyFormat(currency, fractionDigits).format(abs)}`;
}

/** Short form for tight spaces such as chart labels: £97.8k, £1.2m. */
export function formatCompactCurrency(
  value: number | null | undefined,
  currencyCode = "GBP",
  options: FormatOptions = {},
): string {
  return formatCurrency(value, currencyCode, { ...options, compact: true });
}

/** Format a percentage: 12.5 -> "13%", or "12.5%" with `fractionDigits: 1`. Input is percentage points unless `fraction` is set. */
export function formatPercent(
  value: number | null | undefined,
  options: FormatPercentOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER, fractionDigits = 0, fraction = false } = options;
  if (!isFiniteNumber(value)) return placeholder;
  // Intl throws outside 0..20 (and on NaN): clamp so formatting never throws.
  const digits = Number.isFinite(fractionDigits)
    ? Math.min(20, Math.max(0, Math.trunc(fractionDigits)))
    : 0;
  const { abs, sign } = normalise(fraction ? value * 100 : value, digits);
  return `${sign}${plainNumber(abs, digits, digits)}%`;
}

const SPOKEN: Record<string, { major: [string, string]; minor: [string, string] }> = {
  GBP: { major: ["pound", "pounds"], minor: ["penny", "pence"] },
  USD: { major: ["dollar", "dollars"], minor: ["cent", "cents"] },
  EUR: { major: ["euro", "euros"], minor: ["cent", "cents"] },
};

/** Screen-reader friendly amount: "1,234 pounds and 50 pence". */
export function speakCurrency(
  value: number | null | undefined,
  currency = "GBP",
  options: FormatOptions = {},
): string {
  const { placeholder = "not set" } = options;
  if (!isFiniteNumber(value)) return placeholder;

  const code = (currency || "GBP").toUpperCase();
  const names = SPOKEN[code];
  // Always 2 minor units (even for 0-/3-decimal currencies such as JPY/KWD): only
  // GBP/USD/EUR have spoken names, and unknown codes just read "<amount> CODE".
  const totalMinor = Math.round(Math.abs(value) * 100);
  const major = Math.floor(totalMinor / 100);
  const minor = totalMinor % 100;
  const sign = value < 0 && totalMinor !== 0 ? "minus " : "";

  if (!names) {
    return `${sign}${plainNumber(totalMinor / 100, minor === 0 ? 0 : 2, minor === 0 ? 0 : 2)} ${code}`;
  }

  const majorText = `${plainNumber(major, 0, 0)} ${major === 1 ? names.major[0] : names.major[1]}`;
  const minorText = `${minor} ${minor === 1 ? names.minor[0] : names.minor[1]}`;
  if (minor === 0) return `${sign}${majorText}`;
  if (major === 0) return `${sign}${minorText}`;
  return `${sign}${majorText} and ${minorText}`;
}
