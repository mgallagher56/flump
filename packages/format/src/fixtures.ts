/**
 * The cross-platform formatter snapshot: inputs, options and the exact string the web shows today.
 * One fixture, run by every JavaScript engine Flump ships on: V8 (Vitest, fixtures.test.ts),
 * JavaScriptCore (Bun, fixtures.bun.test.ts) and, once the app exists, Hermes on iOS and Android
 * (import `@flump/format/fixtures` and assert `runFormatCase(c) === c.expected` for each case).
 * The currency and percent rows are also pinned to `Money` / `Num` in packages/ui.
 */
import {
  type FormatCurrencyOptions,
  type FormatOptions,
  type FormatPercentOptions,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "./currency.js";
import {
  type DateInput,
  type FormatMonthYearOptions,
  formatDuration,
  formatMonthYear,
} from "./date.js";

type Amount = number | null | undefined;

export type FormatCase =
  | { fn: "formatCurrency"; args: [Amount, string?, FormatCurrencyOptions?]; expected: string }
  | { fn: "formatCompactCurrency"; args: [Amount, string?, FormatOptions?]; expected: string }
  | { fn: "formatPercent"; args: [Amount, FormatPercentOptions?]; expected: string }
  | { fn: "formatMonthYear"; args: [DateInput, FormatMonthYearOptions?]; expected: string }
  | { fn: "formatDuration"; args: [Amount, FormatOptions?]; expected: string };

export function runFormatCase(c: FormatCase): string {
  switch (c.fn) {
    case "formatCurrency":
      return formatCurrency(...c.args);
    case "formatCompactCurrency":
      return formatCompactCurrency(...c.args);
    case "formatPercent":
      return formatPercent(...c.args);
    case "formatMonthYear":
      return formatMonthYear(...c.args);
    case "formatDuration":
      return formatDuration(...c.args);
  }
}

export const FORMAT_FIXTURES: readonly FormatCase[] = [
  // Whole pounds where a figure is read.
  { fn: "formatCurrency", args: [1234], expected: "£1,234" },
  { fn: "formatCurrency", args: [1234.5], expected: "£1,235" },
  { fn: "formatCurrency", args: [-1234], expected: "-£1,234" },
  { fn: "formatCurrency", args: [1_000_000], expected: "£1,000,000" },
  { fn: "formatCurrency", args: [0], expected: "£0" },
  { fn: "formatCurrency", args: [-0.4], expected: "£0" },
  // Pence only where the user types or reconciles.
  { fn: "formatCurrency", args: [1234.5, "GBP", { fractionDigits: 2 }], expected: "£1,234.50" },
  { fn: "formatCurrency", args: [-1234.5, "GBP", { fractionDigits: 2 }], expected: "-£1,234.50" },
  { fn: "formatCurrency", args: [-0.004, "GBP", { fractionDigits: 2 }], expected: "£0.00" },
  { fn: "formatCurrency", args: [10, "EUR"], expected: "€10" },
  { fn: "formatCurrency", args: [5, "USD"], expected: "US$5" },
  { fn: "formatCurrency", args: [5, "not-a-code"], expected: "£5" },
  // Unknown is never £0.
  { fn: "formatCurrency", args: [null], expected: "Not set" },
  { fn: "formatCurrency", args: [undefined], expected: "Not set" },
  { fn: "formatCurrency", args: [Number.NaN], expected: "Not set" },
  { fn: "formatCurrency", args: [Number.POSITIVE_INFINITY], expected: "Not set" },
  { fn: "formatCurrency", args: [null, "GBP", { placeholder: "No data" }], expected: "No data" },

  { fn: "formatCompactCurrency", args: [950], expected: "£950" },
  { fn: "formatCompactCurrency", args: [999.5], expected: "£999.5" },
  { fn: "formatCompactCurrency", args: [1500], expected: "£1.5k" },
  { fn: "formatCompactCurrency", args: [97_800], expected: "£97.8k" },
  { fn: "formatCompactCurrency", args: [250_000], expected: "£250k" },
  { fn: "formatCompactCurrency", args: [999_999], expected: "£1m" },
  { fn: "formatCompactCurrency", args: [1_234_567], expected: "£1.2m" },
  { fn: "formatCompactCurrency", args: [2_500_000_000], expected: "£2.5bn" },
  { fn: "formatCompactCurrency", args: [3_000_000_000_000], expected: "£3tn" },
  { fn: "formatCompactCurrency", args: [-1500], expected: "-£1.5k" },
  { fn: "formatCompactCurrency", args: [-0.04], expected: "£0" },
  { fn: "formatCompactCurrency", args: [0], expected: "£0" },
  { fn: "formatCompactCurrency", args: [null], expected: "Not set" },

  { fn: "formatPercent", args: [12.5, { fractionDigits: 1 }], expected: "12.5%" },
  { fn: "formatPercent", args: [12.5], expected: "13%" },
  { fn: "formatPercent", args: [4, { fractionDigits: 1 }], expected: "4.0%" },
  { fn: "formatPercent", args: [-2.5, { fractionDigits: 1 }], expected: "-2.5%" },
  { fn: "formatPercent", args: [-0.001, { fractionDigits: 1 }], expected: "0.0%" },
  { fn: "formatPercent", args: [1234.5], expected: "1,235%" },
  { fn: "formatPercent", args: [0.045, { fraction: true, fractionDigits: 1 }], expected: "4.5%" },
  { fn: "formatPercent", args: [null], expected: "Not set" },
  { fn: "formatPercent", args: [Number.NaN, { placeholder: "No data" }], expected: "No data" },

  { fn: "formatMonthYear", args: ["2030-03-01"], expected: "Mar 2030" },
  { fn: "formatMonthYear", args: ["2030-03-01", { month: "long" }], expected: "March 2030" },
  // Hand-built month names: "Sep", never ICU's newer "Sept".
  { fn: "formatMonthYear", args: ["2026-09-15"], expected: "Sep 2026" },
  { fn: "formatMonthYear", args: ["2026-13-01"], expected: "Not set" },
  { fn: "formatMonthYear", args: [null], expected: "Not set" },

  { fn: "formatDuration", args: [40], expected: "3 years 4 months" },
  { fn: "formatDuration", args: [25], expected: "2 years 1 month" },
  { fn: "formatDuration", args: [12], expected: "1 year" },
  { fn: "formatDuration", args: [1], expected: "1 month" },
  { fn: "formatDuration", args: [0], expected: "0 months" },
  { fn: "formatDuration", args: [3.6], expected: "4 months" },
  { fn: "formatDuration", args: [-1], expected: "Not set" },
  { fn: "formatDuration", args: [Number.NaN], expected: "Not set" },
  { fn: "formatDuration", args: [null], expected: "Not set" },
];
