import type { KpiDelta } from "@repo/ui";

/** A recorded month's net worth, as the loader passes it to the dashboard. No other figures. */
export interface PriorNetWorth {
  /** "YYYY-MM". */
  month: string;
  netWorth: number;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

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
 * one, in whole pounds. The arrow and its spoken word carry the direction, so the text has no sign
 * ("£320 since October"). `null` when no earlier month is recorded.
 */
export function netWorthDelta(
  netWorth: number | null,
  prior: PriorNetWorth | null | undefined,
  currentMonth: string,
): KpiDelta | null {
  if (netWorth === null || !Number.isFinite(netWorth) || !prior) return null;
  if (!Number.isFinite(prior.netWorth) || prior.month >= currentMonth) return null;
  const change = Math.round(netWorth) - Math.round(prior.netWorth);
  const since = sinceLabel(prior.month, currentMonth);
  if (change === 0) return { direction: "flat", text: `Same as ${since}`, polarity: "asset" };
  return {
    direction: change > 0 ? "up" : "down",
    text: `${pounds(Math.abs(change))} since ${since}`,
    polarity: "asset",
  };
}
