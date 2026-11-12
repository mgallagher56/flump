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
