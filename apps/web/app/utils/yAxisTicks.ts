import { niceStep } from "@repo/ui";

export interface NearDataAxis {
  /** Domain for the y axis: a little below the lowest value and a little above the highest. */
  domain: [number, number];
  /** Round ticks inside the domain, 3 or 4 of them, so the last always sits inside the plot. */
  ticks: number[];
}

/** Most y ticks (P10.4 at 375: more than four crowd a 160px plot). */
export const MAX_Y_TICKS = 4;

/**
 * A y axis that starts near the data (R2-8): ticks are round multiples of a nice step, and the
 * domain reaches a quarter step past the lowest and highest values. £96,000 to £405,000 reads
 * £100k to £400k on a domain of £75,000 to £425,000. Positive data never goes below £0.
 */
export const nearDataAxis = (values: readonly number[]): NearDataAxis => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { domain: [0, 1], ticks: [0] };
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    // A flat series: widen it by a nice step either side (never below £0 for positive data).
    const step = niceStep(Math.abs(max) / 4 || 1);
    min = min >= 0 ? Math.max(0, min - step) : min - step;
    max += step;
  }
  const span = max - min;
  let fallback: NearDataAxis | null = null;
  for (const divisions of [4, 5, 6, 3]) {
    const step = niceStep(span / divisions);
    const pad = step / 4;
    let lo = Math.floor(min / pad) * pad;
    const hi = Math.ceil(max / pad) * pad;
    if (min >= 0 && lo < 0) lo = 0;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step / 1e6; v += step) {
      ticks.push(Math.round(v));
    }
    const axis: NearDataAxis = { domain: [lo === 0 ? 0 : lo, hi], ticks };
    if (ticks.length >= 3 && ticks.length <= MAX_Y_TICKS) return axis;
    if (ticks.length >= 2 && ticks.length <= MAX_Y_TICKS) {
      if (!fallback || ticks.length > fallback.ticks.length) fallback = axis;
    }
  }
  return fallback ?? { domain: [min, max], ticks: [min, max] };
};
