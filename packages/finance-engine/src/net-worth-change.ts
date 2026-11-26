import type { RecordedMonthPoint } from "./recorded-month-comparison.js";

/**
 * The Home hero's one change figure (E16 P6): today's net worth against the latest recorded month
 * before the current one, in whole pounds. Web and the mobile app both read it from here, so
 * neither works out the change itself (E12 S5).
 *
 * Unlike the History hero (`selectRecordedMonthComparison`), which compares two recorded months,
 * this compares the live figure with the last month recorded before this one.
 */
export interface NetWorthChange {
  /** "YYYY-MM": the latest recorded month before the current month. */
  priorMonth: string;
  /** Today's net worth in whole pounds minus that month's, in whole pounds. 0 means the same. */
  change: number;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * - Only recorded months (`allCarried === false`) before `currentMonth` count; the input need not be
 *   sorted, and the latest such month is the comparison.
 * - Each side is rounded to whole pounds first, so the figure matches the two rounded figures a
 *   person reads.
 * - Null when today's net worth is unknown or not finite, when no earlier month is recorded, or
 *   when that month's figure is not finite.
 */
export function selectNetWorthChange(
  netWorth: number | null,
  series: readonly RecordedMonthPoint[],
  currentMonth: string,
): NetWorthChange | null {
  if (netWorth === null || !Number.isFinite(netWorth)) return null;
  const prior = series
    .filter((p) => !p.allCarried && MONTH_RE.test(p.month) && p.month < currentMonth)
    .reduce<RecordedMonthPoint | null>(
      (latest, p) => (!latest || p.month >= latest.month ? p : latest),
      null,
    );
  if (!prior || !Number.isFinite(prior.netWorth)) return null;
  return {
    priorMonth: prior.month,
    change: Math.round(netWorth) - Math.round(prior.netWorth) || 0,
  };
}
