import { type RecordedMonthPoint, selectNetWorthChange } from "@flump/finance-engine";
import type { KpiDelta } from "@repo/ui";

/** A recorded month's net worth, as the loader passes it to the dashboard. No other figures. */
export interface PriorNetWorth {
  /** "YYYY-MM". */
  month: string;
  netWorth: number;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * The month the hero compares with and its total, as the loader passes it on: the engine's
 * `selectNetWorthChange` picks it (E12 S5), so web and the mobile app compare with the same month.
 * `null` when there is no earlier recorded month or today's figure is unknown.
 */
export function priorNetWorth(
  netWorth: number | null,
  series: readonly RecordedMonthPoint[],
  currentMonth: string,
): PriorNetWorth | null {
  const change = selectNetWorthChange(netWorth, series, currentMonth);
  const prior = change ? series.find((p) => p.month === change.priorMonth) : undefined;
  return prior ? { month: prior.month, netWorth: prior.netWorth } : null;
}

/** "October", or "October 2025" when the month is not in the current year. */
export const sinceLabel = (month: string, currentMonth: string): string => {
  const m = MONTH_RE.exec(month);
  if (!m) return month;
  const sameYear = currentMonth.slice(0, 4) === m[1];
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
};

const pounds = (value: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * The hero's one delta (E16 P6): today's net worth against the latest recorded month before this
 * one, in whole pounds, from the engine's `selectNetWorthChange`. The arrow and its spoken word carry the direction, so the text has no sign
 * ("£320 since October"). `null` when no earlier month is recorded.
 */
export function netWorthDelta(
  netWorth: number | null,
  prior: PriorNetWorth | null | undefined,
  currentMonth: string,
): KpiDelta | null {
  if (!prior) return null;
  // The arithmetic is the engine's (E12 S5), so web and the mobile app show the same change.
  const result = selectNetWorthChange(
    netWorth,
    [{ month: prior.month, netWorth: prior.netWorth, allCarried: false }],
    currentMonth,
  );
  if (!result) return null;
  const { change } = result;
  const since = sinceLabel(prior.month, currentMonth);
  if (change === 0) return { direction: "flat", text: `Same as ${since}`, polarity: "asset" };
  return {
    direction: change > 0 ? "up" : "down",
    text: `${pounds(Math.abs(change))} since ${since}`,
    polarity: "asset",
  };
}
