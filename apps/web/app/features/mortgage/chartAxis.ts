import { CHART_AXIS_DEFAULTS } from "@repo/ui";

/** Below this plot width (px) the x axis keeps to a few short ticks so labels never touch. */
export const NARROW_CHART_WIDTH = 480;

/** Most year ticks for a plot this wide: 4 when narrow, else the figure's limit (at most 6). */
export const maxYearTicks = (width: number, figureMax: number): number => {
  const wide = Math.min(figureMax, CHART_AXIS_DEFAULTS.maxXTicks);
  return width > 0 && width < NARROW_CHART_WIDTH ? Math.min(4, wide) : wide;
};

const YEAR_STEPS = [1, 2, 3, 4, 5, 10, 20, 25, 50] as const;

/**
 * Evenly spaced calendar years from the first year on (every 1, 2, 3, 4, 5 or 10 years), using the
 * smallest step that keeps to `maxTicks`. Years with no row are skipped.
 */
export const evenYearTicks = (years: readonly string[], maxTicks: number): string[] => {
  const numbers = years.map(Number).filter(Number.isFinite);
  if (numbers.length === 0) return [];
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  const limit = Math.max(2, Math.trunc(maxTicks));
  const step =
    YEAR_STEPS.find((s) => Math.floor((last - first) / s) + 1 <= limit) ??
    Math.ceil((last - first) / (limit - 1));
  const present = new Set(years);
  const ticks: string[] = [];
  for (let year = first; year <= last; year += step) {
    if (present.has(String(year))) ticks.push(String(year));
  }
  return ticks;
};
