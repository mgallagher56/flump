/** Data-visualisation rules from the E15 spec, as data so tests and docs can reference them. */
export const CHART_RULES = {
  /** Any chart with two or more series shows a legend (or direct labels on every series). */
  legendMinSeries: 2,
  /** Colour is never the only cue: add a dash, marker, direct label or pattern per series. */
  nonColourCueRequired: true,
  /** Area gradients fade to transparent and never exceed this opacity at their strongest point. */
  gradientMaxOpacity: 0.15,
  /** Donut and pie charts show at most this many slices, with the tail grouped as "Other". */
  donutMaxSlices: 6,
  /** Colour identifies the entity (account, asset, series), never the outcome (good or bad). */
  colourBy: "entity",
  /** Forecast lines are dashed so they are not told apart by colour alone. */
  projectionDashed: true,
  /** Unknown figures read "Not set", never 0 or NaN. */
  unknownLabel: "Not set",
} as const;

export type ChartRules = typeof CHART_RULES;

/**
 * Shared Recharts `<Pie>` geometry for every donut, so they all close into one full ring.
 *
 * - The ring starts at 12 o'clock and runs clockwise through a full 360 degrees.
 * - Every slice, including the last, is followed by the same small gap.
 * - `minAngle` keeps a tiny slice wide enough to read as part of the ring, not a detached dot.
 * - The sweep animation is off: a sweep that is cut short (a background tab, a screenshot, a
 *   re-render mid-sweep) leaves the ring open with a gap where the sweep stopped.
 */
export const DONUT_GEOMETRY = {
  startAngle: 90,
  endAngle: -270,
  paddingAngle: 2,
  minAngle: 4,
  innerRadius: "62%",
  outerRadius: "90%",
  isAnimationActive: false,
} as const;
