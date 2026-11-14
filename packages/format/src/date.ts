/** Date, relative time and tax-year formatting. en-GB only; Hermes-safe. */

import { DEFAULT_PLACEHOLDER, type FormatOptions } from "./currency.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DateInput = Date | string | number | null | undefined;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Date-only strings are calendar dates: no timezone shift. */
function parseCalendar(input: DateInput): { y: number; m: number; d: number } | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string") {
    const match = DATE_ONLY.exec(input);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = Number(match[3]);
      const check = new Date(Date.UTC(y, m - 1, d));
      if (
        check.getUTCFullYear() !== y ||
        check.getUTCMonth() !== m - 1 ||
        check.getUTCDate() !== d
      ) {
        return null;
      }
      return { y, m: m - 1, d };
    }
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return { y: date.getFullYear(), m: date.getMonth(), d: date.getDate() };
}

/** "11 Nov 2026". Hand-built so ICU version differences (Sept vs Sep) cannot leak in. */
export function formatDate(input: DateInput, options: FormatOptions = {}): string {
  const { placeholder = DEFAULT_PLACEHOLDER } = options;
  const parts = parseCalendar(input);
  if (!parts) return placeholder;
  return `${parts.d} ${MONTHS[parts.m]} ${parts.y}`;
}

function toTime(input: DateInput): number {
  if (input === null || input === undefined) return Number.NaN;
  return (input instanceof Date ? input : new Date(input)).getTime();
}

type Unit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

const UNITS: Array<[Unit, number]> = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const SINGULAR: Partial<Record<Unit, [past: string, future: string]>> = {
  day: ["yesterday", "tomorrow"],
  week: ["last week", "next week"],
  month: ["last month", "next month"],
  year: ["last year", "next year"],
};

/** Relative phrase for `from` as seen at `now` (inject `now` for determinism). */
export function formatRelativeTime(
  from: DateInput,
  now: Date | number,
  options: FormatOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER } = options;
  const diff = toTime(from) - (now instanceof Date ? now.getTime() : now);
  if (Number.isNaN(diff)) return placeholder;

  const abs = Math.abs(diff);
  const entry = UNITS.find(([, size]) => abs >= size);
  const unit: Unit = entry ? entry[0] : "second";
  const amount = entry ? Math.trunc(diff / entry[1]) : 0;

  // Always hand-rolled (mimicking Intl numeric:"auto") so output is identical on every engine.
  if (amount === 0) return "just now";
  const n = Math.abs(amount);
  if (n === 1) {
    const special = SINGULAR[unit];
    if (special) return amount < 0 ? special[0] : special[1];
  }
  const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
  return amount < 0 ? `${label} ago` : `in ${label}`;
}

/** UK tax year label from its start year: 2025 -> "2025/26". */
export function formatTaxYear(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${end}`;
}

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface FormatMonthYearOptions extends FormatOptions {
  /** "short" gives "Mar 2030" (the default), "long" gives "March 2030". */
  month?: "short" | "long";
}

/** "Mar 2030". Hand-built like `formatDate`, so ICU's "Sept" cannot leak in on any engine. */
export function formatMonthYear(input: DateInput, options: FormatMonthYearOptions = {}): string {
  const { placeholder = DEFAULT_PLACEHOLDER, month = "short" } = options;
  const parts = parseCalendar(input);
  if (!parts) return placeholder;
  return `${(month === "long" ? LONG_MONTHS : MONTHS)[parts.m]} ${parts.y}`;
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * A number of months as "3 years 4 months", dropping a zero part ("2 years", "5 months"); zero
 * reads "0 months". Rounds to whole months. Negative or non-finite input gives the placeholder.
 */
export function formatDuration(
  months: number | null | undefined,
  options: FormatOptions = {},
): string {
  const { placeholder = DEFAULT_PLACEHOLDER } = options;
  if (typeof months !== "number" || !Number.isFinite(months) || months < 0) return placeholder;
  const total = Math.round(months);
  const years = Math.floor(total / 12);
  const rest = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(plural(years, "year"));
  if (rest > 0 || years === 0) parts.push(plural(rest, "month"));
  return parts.join(" ");
}
