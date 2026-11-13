/**
 * Recharts prop presets for the Direction C chart look: a quiet grid, muted axis text, compact
 * en-GB currency ticks (£25k), series colours from `chart.*` tokens, a dashed projection line and a
 * shaded projection band. Spread them onto the matching recharts element:
 *
 *   <CartesianGrid {...chartGridProps} />
 *   <XAxis dataKey="month" {...chartXAxisProps} />
 *   <YAxis {...chartYAxisProps} />
 *   <Line dataKey="netWorth" {...chartLineProps("primary", { animate })} />
 *
 * Nothing here imports recharts, so the presets are plain data and easy to unit test.
 */
import { CHART_INK, type ChartColorRole, chartColor, formatAxisCurrency } from "@repo/ui";

const AXIS_TICK = { fill: CHART_INK.axisText, fontSize: 12 } as const;

export const chartGridProps = {
  stroke: chartColor("grid"),
  strokeWidth: 1,
  vertical: false,
} as const;

export const chartXAxisProps = {
  axisLine: { stroke: chartColor("grid") },
  tick: AXIS_TICK,
  tickLine: false,
  tickMargin: 10,
  minTickGap: 24,
} as const;

/**
 * Compact en-GB currency ticks. Override `tickFormatter` (for example for percentages) or `width`
 * (for very large figures such as "-£12.5m") after the spread: `<YAxis {...chartYAxisProps} width={80} />`.
 */
export const chartYAxisProps = {
  axisLine: false,
  tick: AXIS_TICK,
  tickLine: false,
  tickMargin: 8,
  width: 64,
  tickFormatter: (value: number): string => formatAxisCurrency(value),
} as const;

/** Vertical crosshair for line and area charts. */
export const chartCursorProps = {
  stroke: chartColor("grid"),
  strokeWidth: 1,
} as const;

export interface ChartLinePropsOptions {
  /** Dashed, for forecast data (never colour alone). */
  projection?: boolean;
  /** Pass `useChartAnimation({ dragging })`. Defaults to no animation. */
  animate?: boolean;
}

/** Props for a recharts `<Line>` or `<Area>` stroke: 3px rounded line, no dots, token colour. */
export function chartLineProps(role: ChartColorRole, options: ChartLinePropsOptions = {}) {
  return {
    type: "monotone" as const,
    stroke: chartColor(role),
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: options.projection ? "6 6" : undefined,
    dot: false,
    activeDot: { r: 5, stroke: CHART_INK.surface, strokeWidth: 2, fill: chartColor(role) },
    isAnimationActive: options.animate ?? false,
  };
}

/** Props for the shaded projection region (`<ReferenceArea>` or a no-stroke `<Area>`). */
export const chartBandProps = {
  fill: chartColor("band"),
  stroke: "none",
  ifOverflow: "hidden",
} as const;
