import type { RecordedMonthPoint } from "./recorded-month-comparison.js";
import { snapshotMonthLabel } from "./snapshots.js";

/**
 * The Home hero's trend bars: net worth at the last few recorded months, with the bar geometry
 * worked out here so the web component draws without any arithmetic on money.
 *
 * Scale rule (honest scale): every bar starts at a zero line and runs to its value, on one linear
 * scale whose range is from the lower of zero and the smallest value to the higher of zero and the
 * largest value. The scale is never cropped, so a bar twice as tall is twice the amount. Positive
 * months rise above the zero line, negative months hang below it, and with a mix of both the zero
 * line sits part way up. Nothing about the direction of a change is drawn.
 */

/** Most bars drawn: the last seven recorded months (the Midnight and Mint mock-up). */
export const NET_WORTH_TREND_MAX_BARS = 7;

/**
 * Fewest recorded months drawn (UX-GUIDELINES E7, the same as the History chart's three): with one
 * or two months there is no trend to show, so nothing is drawn.
 */
export const NET_WORTH_TREND_MIN_BARS = 3;

export interface NetWorthTrendBar {
  /** "YYYY-MM". */
  month: string;
  netWorth: number;
  /** The latest recorded month: the last bar, drawn with emphasis. */
  latest: boolean;
  /**
   * The calendar months with no check-in between the bar before and this one ("YYYY-MM", first and
   * last, and how many). Null for the first bar and when the month before was recorded.
   */
  missedBefore: { from: string; to: string; count: number } | null;
  /** Distance from the top of the plot to the bar's top edge, as a percentage of the plot height. */
  top: number;
  /** The bar's height as a percentage of the plot height. 0 for a month at exactly zero. */
  height: number;
}

export interface NetWorthTrend {
  /** Oldest first, at most `NET_WORTH_TREND_MAX_BARS`. */
  bars: NetWorthTrendBar[];
  /** Distance from the top of the plot to the zero line, as a percentage of the plot height. */
  zeroLine: number;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function monthIndex(month: string): number | null {
  const m = MONTH_RE.exec(month);
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
}

/**
 * The trend bars for the last recorded months of a net worth series from `selectNetWorthSeries`
 * (or `selectSavedNetWorthSeries`, which applies the joint-share rule and the net worth choices).
 *
 * - Only recorded months (`allCarried === false`) are bars; carried months are gaps, named in
 *   the next bar's `missedBefore`.
 * - The input need not be sorted; a duplicate month keeps the last one given, and a point with an
 *   invalid month or a non-finite net worth is skipped.
 * - Null with fewer than `NET_WORTH_TREND_MIN_BARS` recorded months, or when every bar would be the
 *   same (E7: no flat series), which includes every month at zero.
 */
export function selectNetWorthTrend(
  series: readonly RecordedMonthPoint[],
  maxBars: number = NET_WORTH_TREND_MAX_BARS,
): NetWorthTrend | null {
  const byMonth = new Map<number, RecordedMonthPoint>();
  for (const p of series) {
    const idx = monthIndex(p.month);
    if (idx === null || p.allCarried || !Number.isFinite(p.netWorth)) continue;
    byMonth.set(idx, p);
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0] - b[0]).slice(-maxBars);
  if (months.length < NET_WORTH_TREND_MIN_BARS) return null;

  const values = months.map(([, p]) => p.netWorth);
  const high = Math.max(0, ...values);
  const low = Math.min(0, ...values);
  if (values.every((v) => v === values[0])) return null;
  const span = high - low;
  const percent = (amount: number) => round2((amount / span) * 100);

  const bars = months.map(([idx, p], i): NetWorthTrendBar => {
    const previous = months[i - 1];
    const count = previous ? idx - previous[0] - 1 : 0;
    return {
      month: p.month,
      netWorth: p.netWorth,
      latest: i === months.length - 1,
      missedBefore:
        previous && count > 0
          ? { from: snapshotMonthLabel(previous[0] + 1), to: snapshotMonthLabel(idx - 1), count }
          : null,
      top: p.netWorth >= 0 ? percent(high - p.netWorth) : percent(high),
      height: percent(Math.abs(p.netWorth)),
    };
  });
  return { bars, zeroLine: percent(high) };
}
