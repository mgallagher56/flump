/** The plot box the lines are drawn on (SVG user units, stretched to the chart's size). */
export const PLOT = { width: 600, height: 200 } as const;

/** A value's height on the plot, as a share from the top (0 at `max`, 1 at `min`). */
export const shareFromTop = (value: number, max: number, min = 0) =>
  1 - (value - min) / (max - min || 1);

/** An SVG path through the values, evenly spaced from left to right. */
export function plotPath(values: readonly number[], max: number, min = 0): string {
  const step = PLOT.width / Math.max(1, values.length - 1);
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(shareFromTop(v, max, min) * PLOT.height).toFixed(2)}`,
    )
    .join(" ");
}

/**
 * Where the line has reached at progress `p` (0 to 1): its share across, its share from the top
 * and the nearest point's index, for the marker and its readout.
 */
export function pointAt(
  values: readonly number[],
  p: number,
  max: number,
  min = 0,
): { x: number; y: number; index: number } {
  const last = values.length - 1;
  if (last < 1) return { x: 1, y: shareFromTop(values[0] ?? min, max, min), index: 0 };
  const f = Math.min(1, Math.max(0, p)) * last;
  const i = Math.min(last - 1, Math.floor(f));
  const t = f - i;
  const v = (values[i] ?? 0) * (1 - t) + (values[i + 1] ?? 0) * t;
  return { x: f / last, y: shareFromTop(v, max, min), index: Math.round(f) };
}

/** The readout box's width for a label, in CSS pixels (14px tabular text and its padding). */
export const readoutWidth = (label: string) => Math.round(label.length * 7.4 + 18);

/** A share as an SVG percentage attribute. */
export const pct = (share: number) => `${(share * 100).toFixed(3)}%`;
