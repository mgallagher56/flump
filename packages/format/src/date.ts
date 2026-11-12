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

  if (typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function") {
    try {
      return new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(amount, unit);
    } catch {
      // fall through to the plain-English fallback
    }
  }

  if (amount === 0) return "just now";
  const n = Math.abs(amount);
  const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
  return amount < 0 ? `${label} ago` : `in ${label}`;
}

/** UK tax year label from its start year: 2025 -> "2025/26". */
export function formatTaxYear(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${end}`;
}
