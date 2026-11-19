import { chartColor } from "./chartColor";

/**
 * The one hover cursor for every chart (owner item 21). Pass it to the chart library's cursor prop,
 * for example Recharts `<Tooltip cursor={CHART_LINE_CURSOR} />`. Colours come from `chart.*`
 * through `chartColor`, so both flip with the theme and need no dark-mode branch.
 */

/** Line and area charts: a thin dashed vertical line in `chart.baseline`. */
export const CHART_LINE_CURSOR = {
  stroke: chartColor("baseline"),
  strokeWidth: 1,
  strokeDasharray: "4 4",
} as const;

/** Bar charts: a soft band behind the hovered group, in `chart.grid`, with no outline. */
export const CHART_BAR_CURSOR = {
  fill: chartColor("grid"),
  fillOpacity: 1,
  stroke: "none",
} as const;
