import { CHART_RULES } from "./chartRules";

/**
 * Shared axis and label defaults for every chart drawn inside a `ChartFigure` (R2-2). The chart
 * library stays in the apps; these are plain values and functions it reads.
 */
export const CHART_AXIS_DEFAULTS = {
  /** Most x-axis ticks (P10.4). */
  maxXTicks: CHART_RULES.maxXTicks,
  /**
   * Space kept clear to the right of the plot, in px, so the last tick label and a direct label
   * at the line end are never clipped ("Dec 202", "Nov 26").
   */
  plotPaddingRight: 24,
  /**
   * Where a direct label sits relative to its line end, in px: to the right of and above the
   * point, so it never covers the line or the end marker.
   */
  directLabelOffset: { dx: 8, dy: -10 },
  /** Share of the data range added above and below the data for an away-from-zero domain. */
  yPadRatio: 0.1,
  /**
   * When the value nearest zero is within this share of the largest absolute value, the axis
   * starts at zero (the data is near zero, so zero is the honest baseline).
   */
  yZeroThreshold: 0.25,
  /** Target number of y-axis intervals used to pick a round step. */
  yTickCount: 4,
} as const;

/**
 * Text anchor for an x tick, so the last label ends at the plot edge instead of running past it.
 * The first label keeps "middle": the y axis gives it room on the left.
 */
export const xTickAnchor = (index: number, count: number): "middle" | "end" =>
  count > 1 && index === count - 1 ? "end" : "middle";

/** en-GB writes September as "Sept"; charts use the three-letter "Sep" like every other month. */
export const normaliseMonthAbbreviation = (text: string): string =>
  text.replace(/\bSept\b/g, "Sep");

export type MonthTickYear = "none" | "2-digit" | "numeric";

const tickFormatters = new Map<MonthTickYear, Intl.DateTimeFormat>();

const tickFormatter = (year: MonthTickYear): Intl.DateTimeFormat => {
  let formatter = tickFormatters.get(year);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      month: "short",
      ...(year === "none" ? {} : { year: year }),
      timeZone: "UTC",
    });
    tickFormatters.set(year, formatter);
  }
  return formatter;
};

const MONTH_KEY = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

const toDate = (value: Date | string | number): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const key = MONTH_KEY.exec(value);
    if (key) {
      const [, y, m, d] = key;
      return new Date(Date.UTC(Number(y), Number(m) - 1, d ? Number(d) : 1));
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * en-GB month tick: "Sep", "Sep 26" or "Sep 2026" (`year`). Accepts a Date, a "2026-09" or
 * "2026-09-01" key, or a timestamp; dates are read in UTC so a month key never shifts a month.
 * Returns "" for an invalid date so the tick draws nothing rather than a wrong label.
 */
export function formatMonthTick(
  value: Date | string | number,
  year: MonthTickYear = "numeric",
): string {
  const date = toDate(value);
  if (!date) return "";
  return normaliseMonthAbbreviation(tickFormatter(year).format(date));
}

/** A round step (1, 2, 2.5 or 5 times a power of ten) at least `raw` wide. */
export const niceStep = (raw: number): number => {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
};

export interface NiceYDomainOptions {
  /** Share of the data range added either side. Defaults to 0.1. */
  padRatio?: number;
  /** Start at zero when the value nearest zero is within this share of the largest. Defaults to 0.25. */
  zeroThreshold?: number;
  /** Target number of intervals for the round step. Defaults to 4. */
  tickCount?: number;
}

/**
 * A y-axis domain close to the data, rounded to a nice step (R2-2). Data far from zero (a pension
 * pot between £180k and £240k) gets a padded [min, max] domain instead of one that starts at £0
 * and flattens the line. Data that crosses zero, or comes near it, keeps zero in the domain.
 * Non-finite values are ignored; with none left it returns [0, 1].
 */
export function niceYDomain(
  values: readonly (number | null | undefined)[],
  options: NiceYDomainOptions = {},
): [number, number] {
  const {
    padRatio = CHART_AXIS_DEFAULTS.yPadRatio,
    zeroThreshold = CHART_AXIS_DEFAULTS.yZeroThreshold,
    tickCount = CHART_AXIS_DEFAULTS.yTickCount,
  } = options;
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);

  const largest = Math.max(Math.abs(lo), Math.abs(hi));
  if (largest === 0) return [0, 1];
  const allPositive = lo >= 0;
  const allNegative = hi <= 0;
  // Near zero: the bound closest to zero is a small share of the largest value.
  const nearZero =
    (allPositive && lo <= largest * zeroThreshold) ||
    (allNegative && Math.abs(hi) <= largest * zeroThreshold);
  const anchorLow = allPositive && nearZero;
  const anchorHigh = allNegative && nearZero;

  const span = hi - lo;
  const pad = span > 0 ? span * padRatio : largest > 0 ? largest * padRatio : 1;
  lo = anchorLow ? 0 : lo - pad;
  hi = anchorHigh ? 0 : hi + pad;
  // Padding never pushes one-signed data across zero.
  if (allPositive && lo < 0) lo = 0;
  if (allNegative && hi > 0) hi = 0;

  const step = niceStep((hi - lo) / Math.max(1, Math.trunc(tickCount)));
  const niceLo = Math.floor(lo / step) * step;
  const niceHi = Math.ceil(hi / step) * step;
  // Normalise -0 so the axis never reads "-£0".
  return [niceLo === 0 ? 0 : niceLo, niceHi === 0 ? 0 : niceHi];
}
