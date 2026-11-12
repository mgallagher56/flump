/** Currency, percent and speech formatting. en-GB only; Hermes-safe Intl. */

const LOCALE = "en-GB";
const MINUS = "−";

export const DEFAULT_PLACEHOLDER = "Not set";

export interface FormatOptions {
  /** Shown for null, undefined, NaN and +/-Infinity. Default "Not set". */
  placeholder?: string;
}

export interface FormatCurrencyOptions extends FormatOptions {
  /** Abbreviate large values (1.5k, 2.3m, 1.1bn) with no decimals below 1,000. */
  compact?: boolean;
}

export interface FormatPercentOptions extends FormatOptions {
  /** Max fraction digits. Default 1. */
  fractionDigits?: number;
  /** Treat the input as a fraction (0.045 -> 4.5%). Default false. */
  fraction?: boolean;
}

export function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function cached(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  let f = formatterCache.get(key);
  if (!f) {
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

function currencySymbolPrefix(abs: number, currency: string): string | null {
  try {
    return cached(
      `c:${currency}`,
      () =>
        new Intl.NumberFormat(LOCALE, {
          style: "currency",
          currency,
          currencyDisplay: "narrowSymbol",
        }),
    ).format(abs);
  } catch {
    return null;
  }
}

function currencyDigits(currency: string): number {
  try {
    return (
      cached(
        `c:${currency}`,
        () => new Intl.NumberFormat(LOCALE, { style: "currency", currency }),
      ).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Symbol (or code) for a currency, derived from Intl with a code fallback. */
function currencyPrefix(currency: string): string {
  const sample = currencySymbolPrefix(0, currency);
  if (sample === null) return `${currency.toUpperCase()} `;
  return sample.replace(/[\d.,\s ]/g, "") === ""
    ? `${currency.toUpperCase()} `
    : sample.replace(/[\d.,]/g, "");
}

function compactParts(abs: number): { scaled: number; suffix: string } {
  const units: Array<[number, string]> = [
    [1e9, "bn"],
    [1e6, "m"],
    [1e3, "k"],
  ];
  for (let i = 0; i < units.length; i++) {
    const [size, suffix] = units[i] as [number, string];
    if (abs >= size) {
      const scaled = Math.round((abs / size) * 10) / 10;
      // Rounding can tip into the next unit (999,999 -> 1,000k -> 1m).
      const next = units[i - 1];
      if (next && scaled * size >= next[0])
        return { scaled: (scaled * size) / next[0], suffix: next[1] };
      return { scaled, suffix };
    }
  }
  return { scaled: Math.round(abs), suffix: "" };
}

/**
 * Format a monetary value. 0 renders as £0.00; null/undefined/NaN/Infinity
 * render as the placeholder (never £0.00). Negatives use a true minus (U+2212).
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = "GBP",
  options: FormatCurrencyOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER, compact = false } = options;
  if (!isFiniteNumber(value)) return placeholder;

  const digits = compact ? 0 : currencyDigits(currency);
  const abs = Math.abs(value);
  const isZero = Math.round(abs * 10 ** digits) === 0;
  const sign = value < 0 && !isZero ? MINUS : "";

  if (compact) {
    const { scaled, suffix } = compactParts(abs);
    return `${sign}${currencyPrefix(currency)}${plainNumber(scaled, 0, 1)}${suffix}`;
  }

  const symbolic = currencySymbolPrefix(abs, currency);
  if (symbolic !== null) {
    // Code-style output ("ZZZ 5.00") keeps its own spacing; symbols hug the number.
    return `${sign}${symbolic.replace(/ /g, " ")}`;
  }
  return `${sign}${currency.toUpperCase()} ${plainNumber(abs, 2, 2)}`;
}

/** Format a percentage. Input is percentage points unless `fraction` is set. */
export function formatPercent(
  value: number | null | undefined,
  options: FormatPercentOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER, fractionDigits = 1, fraction = false } = options;
  if (!isFiniteNumber(value)) return placeholder;
  const points = fraction ? value * 100 : value;
  const abs = Math.abs(points);
  const isZero = Math.round(abs * 10 ** fractionDigits) === 0;
  const sign = points < 0 && !isZero ? MINUS : "";
  return `${sign}${plainNumber(abs, 0, fractionDigits)}%`;
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

  const code = currency.toUpperCase();
  const names = SPOKEN[code];
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
