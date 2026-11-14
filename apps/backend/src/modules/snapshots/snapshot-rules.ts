import {
  compareYearMonth,
  lastDayOfMonth,
  londonDate,
  londonYearMonth,
  parseMonthKey,
  type YearMonth,
} from "./london-date";

/**
 * The E30 snapshot rules, shared by `PUT /snapshots/:month` and the import pipeline (E17 PR C) so
 * a value is accepted or refused the same way whichever door it comes through.
 */

/** Earliest month a snapshot may be written for (back-filling a spreadsheet history). */
const EARLIEST_SNAPSHOT: YearMonth = { year: 2000, month: 1 };
const MAX_ABS_VALUE = 1e10;

/** Only UUID-shaped ids can match an account; anything else is treated as unknown. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SnapshotMonthError = "bad_month" | "future_month" | "too_early";

const hasAtMostTwoDecimals = (v: number): boolean => {
  const scaled = v * 100;
  return Math.abs(scaled - Math.round(scaled)) <= Math.max(1e-6, Math.abs(scaled) * 1e-12);
};

/** Parses a "YYYY-MM" key and applies the window: not in the future (London), not before 2000. */
export function checkSnapshotMonth(
  key: unknown,
  now: Date = new Date(),
): { ok: true; target: YearMonth } | { ok: false; code: SnapshotMonthError } {
  const target = typeof key === "string" ? parseMonthKey(key) : null;
  if (!target) return { ok: false, code: "bad_month" };
  if (compareYearMonth(target, londonYearMonth(now)) > 0)
    return { ok: false, code: "future_month" };
  if (compareYearMonth(target, EARLIEST_SNAPSHOT) < 0) return { ok: false, code: "too_early" };
  return { ok: true, target };
}

/** A finite number below 10 billion with at most 2 decimal places. */
export function isValidSnapshotValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) < MAX_ABS_VALUE &&
    hasAtMostTwoDecimals(value)
  );
}

/** The as-of date a value gets when none is given: today for the current month, else month end. */
export function defaultAsOfDate(target: YearMonth, now: Date = new Date()): string {
  return compareYearMonth(target, londonYearMonth(now)) === 0
    ? londonDate(now)
    : lastDayOfMonth(target);
}
