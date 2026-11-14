import {
  CHART_INK,
  ChartFigure,
  CollapsibleDrawer,
  chartColor,
  formatMonthTick,
  niceStep,
  niceYDomain,
  Table,
  TBody,
  Td,
  THead,
  Th,
  useChartFigure,
  xTickAnchor,
} from "@repo/ui";
import type { FC, ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
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
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatMonth, type HistoryChartPoint } from "../../snapshotModel";
import {
  chartStack,
  chartWrap,
  dataRow,
  dataRowEnd,
  directLabel,
} from "./NetWorthHistoryChart.styles";

/** Fewest recorded months worth drawing as a line (plan P10.6). */
export const MIN_CHART_MONTHS = 3;

export interface NetWorthHistoryChartProps {
  points: readonly HistoryChartPoint[];
  /** One sentence with at most 2 figures, shown under the title and read instead of the drawing. */
  summary: string;
  /** Months with a recorded value. Below `MIN_CHART_MONTHS` no line is drawn (P10.6). */
  recordedMonths: number;
  /** The one-line prompt shown instead of the chart when there are too few recorded months. */
  notEnoughDataText?: string;
  /**
   * Quiet links and text in one row with "Show data" (for example "Add earlier months"), styled
   * with `quietLink`, so every link under the chart lines up and looks the same.
   */
  dataActions?: ReactNode;
}

interface DirectLabelProps {
  text: string;
  /** The figure's label offset, mirrored to sit above left of the dot (recharts owns `offset`). */
  shift: { dx: number; dy: number };
  /** Supplied by recharts: the box around the annotated dot. */
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}

/** The end-point label: drawn above and to the left of the dot so it never clips at the edge. */
const DirectLabel: FC<DirectLabelProps> = ({ text, shift, viewBox }) => {
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const y = viewBox?.y ?? 0;
  return (
    <text
      fill={CHART_INK.text}
      className={directLabel()}
      dx={-shift.dx}
      dy={shift.dy}
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
              label={<DirectLabel shift={labelOffset} text={annotation.label} />}
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

/**
 * "Show data" and the caller's quiet links in one aligned row. The drawer's trigger and its table
 * become items of the row (`display: contents`), so the table opens full width under the row.
 */
export const ChartDataRow: FC<{ table?: ReactNode; actions?: ReactNode }> = ({
  table,
  actions,
}) => {
  if (!table && !actions) return null;
  return (
    <div className={dataRow()}>
      {table ? (
        <CollapsibleDrawer title="Show data" variant="quiet">
          {table}
        </CollapsibleDrawer>
      ) : null}
      {actions ? <div className={dataRowEnd()}>{actions}</div> : null}
    </div>
  );
};

/**
 * Net worth over time from saved monthly snapshots. Recorded months are a solid line; a month with
 * no check-in shows the carried-forward value as a dashed line (never colour alone), and the caller's
 * summary says so in words. The end point is labelled with net worth (P10.2, P10.3). With fewer than 3 recorded months no line is drawn:
 * the summary and a one-line prompt show instead (P10.6).
 */
export const NetWorthHistoryChart: FC<NetWorthHistoryChartProps> = ({
  points,
  summary,
  recordedMonths,
  notEnoughDataText,
  dataActions,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const drawn = recordedMonths >= MIN_CHART_MONTHS;
  const last = points.at(-1);

  return (
    <div className={chartStack()}>
      <ChartFigure
        annotation={last ? { x: last.label, label: formatCurrency(last.netWorth) } : undefined}
        directLabels
        headingLevel="h2"
        hideTitle
        // One series, named by the title, so no legend. The dashed months are named in the summary
        // and the data table's Source column, so the dash is never the only cue.
        minPoints={MIN_CHART_MONTHS}
        notEnoughDataText={notEnoughDataText}
        pointCount={recordedMonths}
        summary={summary}
        title="Net worth over time"
      >
        <MonthLinePlot points={points} />
      </ChartFigure>
      <ChartDataRow
        actions={dataActions}
        table={
          drawn ? (
            <Table caption="Net worth by month">
              <THead>
                <tr>
                  <Th>Month</Th>
                  <Th numeric>Net worth</Th>
                  <Th>Source</Th>
                </tr>
              </THead>
              <TBody>
                {points.map((p) => (
                  <tr key={p.month}>
                    <Th scope="row">{formatMonth(p.month)}</Th>
                    <Td numeric>{formatCurrency(p.netWorth)}</Td>
                    <Td>{p.recorded !== null ? "Recorded" : "Carried forward"}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : undefined
        }
      />
    </div>
  );
};

export default NetWorthHistoryChart;
