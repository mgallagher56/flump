import { CHART_AXIS_DEFAULTS, niceStep, niceYDomain } from "@repo/ui";

/** Below this plot width (px) the x axis keeps to a few short ticks so labels never touch. */
export const NARROW_CHART_WIDTH = 480;

/** Over this many months the axis is labelled with years only ("2027"). */
export const YEAR_TICKS_FROM_MONTHS = 24;

const STEPS = [1, 2, 3, 4, 5, 10, 20, 25, 50] as const;

/** The smallest step from `STEPS` that puts at most `limit` ticks on `count` slots. */
const evenStep = (count: number, limit: number): number =>
  STEPS.find((s) => Math.floor((count - 1) / s) + 1 <= limit) ??
  Math.ceil((count - 1) / Math.max(1, limit - 1));

export interface MonthTicks {
  /** Month offsets (0 = this month) to draw a tick at. */
  ticks: number[];
  /** True when the labels are years only ("2027"); else month and year ("Sep 2027"). */
  yearsOnly: boolean;
}

/**
 * Evenly spaced x ticks for a chart of months 0..`lastMonth` from `now` (R2-7). Up to two years it
 * ticks months ("Sep 2027") at an even interval from this month; over that it ticks each January,
 * every 1, 2, 3, 4 or 5 years, labelled with the year only. A narrow plot keeps to 3 month ticks or 4
 * year ticks; a wide one to the figure's limit (at most 6). A width of 0 (not measured) is wide.
 */
export const monthTicks = (
  lastMonth: number,
  width: number,
  figureMax: number,
  now: Date = new Date(),
): MonthTicks => {
  const last = Math.max(0, Math.trunc(lastMonth));
  const narrow = width > 0 && width < NARROW_CHART_WIDTH;
  const wide = Math.min(figureMax, CHART_AXIS_DEFAULTS.maxXTicks);
  if (last <= YEAR_TICKS_FROM_MONTHS) {
    const limit = narrow ? Math.min(3, wide) : wide;
    const step = Math.max(1, Math.ceil(last / (Math.max(2, limit) - 1)));
    const ticks: number[] = [];
    for (let m = 0; m <= last; m += step) ticks.push(m);
    return { ticks, yearsOnly: false };
  }
  // Month offset of the first January after this month (this month when it is January).
  const firstJanuary = (12 - now.getMonth()) % 12;
  const januaries: number[] = [];
  for (let m = firstJanuary; m <= last; m += 12) januaries.push(m);
  const limit = narrow ? Math.min(4, wide) : wide;
  const step = evenStep(januaries.length, Math.max(2, limit));
  return { ticks: januaries.filter((_, i) => i % step === 0), yearsOnly: true };
};

export interface YAxisScale {
  domain: [number, number];
  /** Evenly spaced round ticks from the bottom of the domain to the top. */
  ticks: number[];
}

/**
 * A y axis for debt balances (R2-7): round, evenly spaced ticks (£0, £2.5k, £5k, £7.5k, £10k)
 * from `niceYDomain` with no padding, so the top tick is never more than one step above the
 * largest balance. Recharts would otherwise pick its own uneven ticks inside the domain.
 */
export const yAxisScale = (
  values: readonly (number | null | undefined)[],
  tickCount: number = CHART_AXIS_DEFAULTS.yTickCount,
): YAxisScale => {
  const [lo, hi] = niceYDomain(values, { padRatio: 0, tickCount });
  const step = niceStep((hi - lo) / Math.max(1, tickCount));
  const ticks: number[] = [];
  // Rounded, so float steps (2.5k) never drift.
  for (let i = 0; lo + i * step <= hi + step / 1000; i += 1) {
    ticks.push(Math.round((lo + i * step) * 100) / 100);
  }
  return { domain: [lo, ticks.at(-1) ?? hi], ticks };
};
