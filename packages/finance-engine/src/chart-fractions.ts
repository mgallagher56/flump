/**
 * A line chart's point heights as fractions of the plot (E12 S6), so the mobile app draws the
 * account and net worth history lines with no arithmetic on money, as `selectNetWorthTrend` gives
 * the Home bars.
 *
 * Scale rule: the lowest value sits on the bottom edge (0) and the highest on the top edge (1), on
 * one linear scale, so the line uses the whole plot. A line of equal values (or one point) sits in
 * the middle (0.5): there is no movement to show, and nothing is drawn at an edge it did not reach.
 * A value that is not a finite number gets the middle too, so one bad point never stretches the
 * scale. Each fraction is rounded to four places, which is well under a pixel on any phone.
 */

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

/** One fraction in 0..1 per value, in the same order; 1 is the top of the plot. */
export function selectChartFractions(values: readonly number[]): number[] {
  // With no finite value every point is non-finite, so the scale's bounds are never read.
  const finite = values.filter((v) => Number.isFinite(v));
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  const span = high - low;
  return values.map((v) => {
    if (!Number.isFinite(v) || span === 0) return 0.5;
    return round4((v - low) / span);
  });
}
