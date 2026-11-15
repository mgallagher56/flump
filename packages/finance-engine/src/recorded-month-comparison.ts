import type { NetWorthPoint } from "./snapshots.js";

/**
 * The net worth change between the last two **recorded** months (owner ruling 4, History hero).
 *
 * A month is recorded when at least one account has a saved row for it, which is
 * `NetWorthPoint.allCarried === false` from `selectNetWorthSeries`. A month with no rows is carried
 * forward (its figures are copied from earlier months) and is never one side of the comparison, so
 * a carried month never shows as a change of zero, and a gap is never hidden.
 *
 * Pure: the caller passes the current month ("YYYY-MM", Europe/London on the web), so the result
 * does not depend on the clock. Month names are en-GB, from `Intl`.
 */

/** One month, named for display. */
export interface ComparedMonth {
  /** "YYYY-MM". */
  key: string;
  /** The month alone, en-GB: "October". */
  name: string;
  year: number;
}

export interface RecordedMonthComparison {
  /** The later recorded month: the current month when it is recorded. */
  month: ComparedMonth;
  /** The recorded month before `month`. Carried months between the two are skipped. */
  previousMonth: ComparedMonth;
  netWorth: number;
  previousNetWorth: number;
  /** `netWorth` minus `previousNetWorth`, rounded to the penny, whether up or down. */
  netWorthChange: number;
  /** True when `previousMonth` is the calendar month immediately before `month`. */
  consecutive: boolean;
}

export interface RecordedMonthComparisonResult {
  currentMonth: ComparedMonth;
  /** The current month has at least one recorded balance (the monthly check-in is done). */
  currentMonthRecorded: boolean;
  /** Months up to and including the current month with a recorded balance. */
  recordedMonths: number;
  /** Null with fewer than two recorded months: no change, and no invented comparison. */
  comparison: RecordedMonthComparison | null;
}

export type RecordedMonthPoint = Pick<NetWorthPoint, "month" | "netWorth" | "allCarried">;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const MONTH_NAME = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

const round2 = (n: number): number => Math.round(n * 100) / 100;

function parse(key: string): { year: number; month: number } | null {
  const m = MONTH_RE.exec(key);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

function index(p: { year: number; month: number }): number {
  return p.year * 12 + (p.month - 1);
}

function named(key: string, p: { year: number; month: number }): ComparedMonth {
  return {
    key,
    name: MONTH_NAME.format(new Date(Date.UTC(p.year, p.month - 1, 1))),
    year: p.year,
  };
}

/**
 * Which two months the History hero compares, and the change between them.
 *
 * - Only recorded months (`allCarried === false`) count; carried months are skipped.
 * - Months after `currentMonth` are ignored, and the input need not be sorted.
 * - The later side is the latest recorded month up to `currentMonth`, so when the current month is
 *   not recorded yet the change is between the two recorded months before it.
 * - With fewer than two recorded months `comparison` is null.
 *
 * @throws RangeError when `currentMonth` is not "YYYY-MM".
 */
export function selectRecordedMonthComparison(
  series: readonly RecordedMonthPoint[],
  currentMonth: string,
): RecordedMonthComparisonResult {
  const current = parse(currentMonth);
  if (!current) throw new RangeError(`currentMonth must be "YYYY-MM", got "${currentMonth}"`);
  const currentIdx = index(current);

  const recorded = series
    .map((p) => {
      const parsed = parse(p.month);
      return parsed && !p.allCarried && Number.isFinite(p.netWorth)
        ? { point: p, parsed, idx: index(parsed) }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.idx <= currentIdx)
    .sort((a, b) => a.idx - b.idx);
  // One entry per month: a duplicate month keeps the last one given.
  const byMonth = new Map(recorded.map((r) => [r.idx, r]));
  const months = [...byMonth.values()];

  const latest = months.at(-1);
  const previous = months.at(-2);
  const currentMonthRecorded = latest?.idx === currentIdx;

  return {
    currentMonth: named(currentMonth, current),
    currentMonthRecorded,
    recordedMonths: months.length,
    comparison:
      latest && previous
        ? {
            month: named(latest.point.month, latest.parsed),
            previousMonth: named(previous.point.month, previous.parsed),
            netWorth: latest.point.netWorth,
            previousNetWorth: previous.point.netWorth,
            netWorthChange: round2(latest.point.netWorth - previous.point.netWorth) || 0,
            consecutive: latest.idx - previous.idx === 1,
          }
        : null,
  };
}
