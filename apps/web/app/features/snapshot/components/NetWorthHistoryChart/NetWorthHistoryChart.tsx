import {
  CHART_INK,
  ChartFigure,
  ChartLegend,
  chartColor,
  pickTicks,
  Table,
  TBody,
  Td,
  THead,
  Th,
  useChartFigure,
} from "@repo/ui";
import type { FC } from "react";
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
import { chartWrap } from "./NetWorthHistoryChart.styles";

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
}

interface DirectLabelProps {
  text: string;
  /** Supplied by recharts: the box around the annotated dot. */
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}

/** The end-point label: drawn just above and to the left of the dot so it never clips at the edge. */
const DirectLabel: FC<DirectLabelProps> = ({ text, viewBox }) => {
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const y = viewBox?.y ?? 0;
  return (
    <text
      fill={CHART_INK.text}
      fontSize={13}
      fontWeight={600}
      // tabular-nums is inherited from the chart wrapper.
      textAnchor="end"
      x={x}
      y={y - 8}
    >
      {text}
    </text>
  );
};

interface PlotProps {
  points: readonly HistoryChartPoint[];
  hasCarried: boolean;
}

/** The drawing itself. Reads the end-point annotation and tick limit from the enclosing figure. */
const Plot: FC<PlotProps> = ({ points, hasCarried }) => {
  const { annotation, maxTicks } = useChartFigure();
  const ticks = pickTicks(
    points.map((p) => p.label),
    maxTicks,
  );
  const annotated = annotation ? points.find((p) => p.label === annotation.x) : undefined;
  return (
    <div className={chartWrap()} data-testid="net-worth-history-chart" id="net-worth-history-chart">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={[...points]} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="label" {...chartXAxisProps} interval={0} ticks={ticks} />
          <YAxis {...chartYAxisProps} />
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
            name="Net worth"
          />
          {annotation && annotated ? (
            <ReferenceDot
              fill={chartColor("primary")}
              label={<DirectLabel text={annotation.label} />}
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
 * Net worth over time from saved monthly snapshots. Recorded months are a solid line; a month with
 * no check-in shows the carried-forward value as a dashed line (never colour alone). The end point
 * is labelled with net worth (P10.2, P10.3). With fewer than 3 recorded months no line is drawn:
 * the summary and a one-line prompt show instead (P10.6).
 */
export const NetWorthHistoryChart: FC<NetWorthHistoryChartProps> = ({
  points,
  summary,
  recordedMonths,
  notEnoughDataText,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const hasCarried = points.some((p) => p.recorded === null && p.carried !== null);
  const drawn = recordedMonths >= MIN_CHART_MONTHS;
  const last = points.at(-1);

  return (
    <ChartFigure
      annotation={last ? { x: last.label, label: formatCurrency(last.netWorth) } : undefined}
      dataTable={
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
      directLabels
      headingLevel="h2"
      hideTitle
      // One series, named by the title, so no legend; the key only explains the dashed months.
      legend={
        hasCarried ? (
          <ChartLegend
            id="net-worth-history-legend"
            items={[
              { id: "recorded", label: "Recorded", color: "primary", swatch: "line" },
              {
                id: "carried",
                label: "Carried forward (no check-in)",
                color: "primary",
                swatch: "dashed",
              },
            ]}
          />
        ) : undefined
      }
      minPoints={MIN_CHART_MONTHS}
      notEnoughDataText={notEnoughDataText}
      pointCount={recordedMonths}
      summary={summary}
      title="Net worth over time"
    >
      <Plot hasCarried={hasCarried} points={points} />
    </ChartFigure>
  );
};

export default NetWorthHistoryChart;
