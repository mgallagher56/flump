import {
  CHART_INK,
  chartColor,
  formatMonthTick,
  niceStep,
  niceYDomain,
  useChartFigure,
  xTickAnchor,
} from "@repo/ui";
import type { FC } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartTooltip,
  chartCursorProps,
  chartGridProps,
  chartLineProps,
  chartXAxisProps,
  chartYAxisProps,
} from "~/features/charts";
import type { HistoryChartPoint } from "~/features/snapshot/snapshotModel";
import { chartWrap, directLabel } from "./MonthLinePlot.styles";

interface DirectLabelProps {
  text: string;
  /** The figure's label offset, mirrored to sit above left of the dot (recharts owns `offset`). */
  shift: { dx: number; dy: number };
  /** The drawn line's points (x label and value), oldest first, ending at the labelled dot. */
  line?: readonly { x: string; y: number }[];
  /** Supplied by recharts: the box around the annotated dot. */
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}

/** Rough width of the label text in pixels (semibold `sm` figures): enough to clear the line. */
const labelWidth = (text: string) => text.length * 8.5;

/** Space kept between the label's baseline and the line beneath it (clears the text box too). */
const LABEL_LINE_GAP = 8;

/**
 * The label's vertical offset from the dot (`dy`, negative is up), so the whole label sits above
 * the line end: at least `minDy` above the dot, and higher where the line rises within the label's
 * span to the left of the dot (a falling line runs into the label otherwise). Pixel points, oldest
 * first, ending at the dot.
 */
export const endLabelDy = (
  dot: { x: number; y: number },
  linePoints: readonly { x: number; y: number }[],
  span: number,
  minDy: number,
): number => {
  const left = dot.x - span;
  let top = dot.y;
  for (let i = linePoints.length - 1; i > 0; i--) {
    const b = linePoints[i] as { x: number; y: number };
    const a = linePoints[i - 1] as { x: number; y: number };
    if (b.x <= left) break;
    top = Math.min(top, b.y);
    if (a.x >= left) top = Math.min(top, a.y);
    else if (b.x > a.x) top = Math.min(top, a.y + ((b.y - a.y) * (left - a.x)) / (b.x - a.x));
  }
  return Math.min(minDy, top - dot.y - LABEL_LINE_GAP);
};

/**
 * The end-point label: drawn above and to the left of the dot so it never clips at the edge, and
 * lifted clear of the line where the line comes down into the end point.
 */
const DirectLabel: FC<DirectLabelProps> = ({ text, shift, line = [], viewBox }) => {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const half = (viewBox?.height ?? 0) / 2;
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const y = (viewBox?.y ?? 0) + half;
  // By default the baseline sits `shift.dy` above the top of the dot.
  let dy = shift.dy - half;
  const end = line.at(-1);
  const endX = end && xScale ? xScale(end.x) : undefined;
  const endY = end && yScale ? yScale(end.y) : undefined;
  if (xScale && yScale && typeof endX === "number" && typeof endY === "number") {
    // Line the scaled points up with the dot itself (a category scale may give the band start).
    const pixels = line.flatMap((p) => {
      const px = xScale(p.x);
      const py = yScale(p.y);
      return typeof px === "number" && typeof py === "number"
        ? [{ x: px + x - endX, y: py + y - endY }]
        : [];
    });
    dy = endLabelDy({ x, y }, pixels, shift.dx + labelWidth(text), dy);
  }
  return (
    <text
      fill={CHART_INK.text}
      className={directLabel()}
      dx={-shift.dx}
      dy={dy}
      // tabular-nums is inherited from the chart wrapper.
      textAnchor="end"
      x={x}
      y={y}
    >
      {text}
    </text>
  );
};

/**
 * Evenly spaced x ticks, counted back from the last month so the latest month always has a tick:
 * every month up to `maxTicks`, then every second (or third) month, never an uneven gap.
 */
export const monthTicks = <T,>(values: readonly T[], maxTicks: number): T[] => {
  const limit = Math.max(2, Math.trunc(maxTicks));
  if (values.length <= limit) return [...values];
  const step = Math.ceil((values.length - 1) / (limit - 1));
  const picked: T[] = [];
  for (let i = values.length - 1; i >= 0; i -= step) picked.unshift(values[i] as T);
  return picked;
};

/**
 * Y ticks on round steps inside the domain (for example £210k, £220k, £230k), so the axis never
 * reads £216.5k, £223k, £229.5k. The step is a round one for about four intervals.
 */
export const yTicks = ([lo, hi]: readonly [number, number], intervals = 4): number[] => {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo];
  const step = niceStep((hi - lo) / intervals);
  const ticks: number[] = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + step * 1e-9; k++) {
    const v = k * step;
    // Normalise -0 so the axis never reads "-£0".
    ticks.push(v === 0 ? 0 : v);
  }
  return ticks;
};

interface MonthTickProps {
  x?: number;
  y?: number;
  index?: number;
  payload?: { value: string };
  /** Tick text per point label ("Sep", or "Sep 26" when the months span two years). */
  textFor: (label: string) => string;
  count: number;
}

/** An x tick whose last label ends at the plot edge (`xTickAnchor`), so "Nov" is never clipped. */
const MonthTick: FC<MonthTickProps> = ({ x, y, index = 0, payload, textFor, count }) => (
  <text {...chartXAxisProps.tick} dy="0.71em" textAnchor={xTickAnchor(index, count)} x={x} y={y}>
    {payload ? textFor(payload.value) : ""}
  </text>
);

/** The drawn line's points (recorded or carried), oldest first, up to the labelled month. */
const linePoints = (points: readonly HistoryChartPoint[], endLabel: string | number) => {
  const end = points.findIndex((p) => p.label === String(endLabel));
  return points.slice(0, end === -1 ? points.length : end + 1).flatMap((p) => {
    const v = p.recorded ?? p.carried;
    return v === null || v === undefined ? [] : [{ x: p.label, y: v }];
  });
};

export interface MonthLinePlotProps {
  points: readonly HistoryChartPoint[];
  /** The line's name in the tooltip ("Net worth", "Balance"). */
  valueName?: string;
  /** Id and test id of the drawing. */
  id?: string;
}

/**
 * The drawing itself, shared by net worth history and the account page so both read the same:
 * evenly spaced month ticks, round £k y ticks, the same gridlines, a solid recorded line, a dashed
 * line through carried months, and the end point labelled. Reads the end-point annotation and
 * tick limit from the enclosing `ChartFigure`.
 */
export const MonthLinePlot: FC<MonthLinePlotProps> = ({
  points,
  valueName = "Net worth",
  id = "net-worth-history-chart",
}) => {
  const hasCarried = points.some((p) => p.recorded === null && p.carried !== null);
  const { annotation, maxTicks, labelOffset, plotPaddingRight } = useChartFigure();
  const ticks = monthTicks(
    points.map((p) => p.label),
    maxTicks,
  );
  const monthByLabel = new Map(points.map((p) => [p.label, p.month]));
  const oneYear = new Set(points.map((p) => p.month.slice(0, 4))).size <= 1;
  const textFor = (label: string): string =>
    formatMonthTick(monthByLabel.get(label) ?? label, oneYear ? "none" : "2-digit");
  // Close to the data, so a change of a few thousand on a large net worth is not a flat line.
  const yDomain = niceYDomain(points.map((p) => p.netWorth));
  const yAxisTicks = yTicks(yDomain);
  const annotated = annotation ? points.find((p) => p.label === annotation.x) : undefined;
  return (
    <div className={chartWrap()} data-testid={id} id={id}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={[...points]}
          margin={{ top: 28, right: plotPaddingRight, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="label"
            {...chartXAxisProps}
            interval={0}
            tick={<MonthTick count={ticks.length} textFor={textFor} />}
            ticks={ticks}
          />
          <YAxis {...chartYAxisProps} domain={yDomain} interval={0} ticks={yAxisTicks} />
          <Tooltip
            content={<ChartTooltip hiddenKeys={hasCarried ? [] : ["carried"]} />}
            cursor={chartCursorProps}
          />
          {hasCarried ? (
            <Line
              {...chartLineProps("primary", { projection: true })}
              connectNulls={false}
              type="linear"
              dataKey="carried"
              name="Carried forward"
              strokeOpacity={0.7}
            />
          ) : null}
          <Line
            {...chartLineProps("primary")}
            connectNulls={false}
            type="linear"
            dataKey="recorded"
            dot={false}
            name={valueName}
          />
          {annotation && annotated ? (
            <ReferenceDot
              fill={chartColor("primary")}
              label={
                <DirectLabel
                  line={linePoints(points, annotation.x)}
                  shift={labelOffset}
                  text={annotation.label}
                />
              }
              r={4}
              stroke={CHART_INK.surface}
              strokeWidth={2}
              x={annotation.x}
              y={annotated.netWorth}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
