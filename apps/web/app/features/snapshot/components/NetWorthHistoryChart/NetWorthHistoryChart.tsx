import {
  ChartFigure,
  ChartLegend,
  type ChartLegendItem,
  chartColor,
  Table,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import type { FC } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { formatMonth, type HistoryChartPoint, type MonthKey } from "../../snapshotModel";
import { chartWrap } from "./NetWorthHistoryChart.styles";

export interface ProjectionPoint {
  month: MonthKey;
  label: string;
  projected: number;
}

export interface NetWorthHistoryChartProps {
  points: readonly HistoryChartPoint[];
  /** Single-snapshot state: an illustrative line from the one recorded month. */
  projection?: readonly ProjectionPoint[];
  /** Short text read out instead of the drawing. */
  summary: string;
}

interface Row {
  month: MonthKey;
  label: string;
  recorded: number | null;
  carried: number | null;
  projected: number | null;
}

function mergeRows(
  points: readonly HistoryChartPoint[],
  projection: readonly ProjectionPoint[],
): Row[] {
  const byMonth = new Map<MonthKey, Row>();
  for (const p of points) {
    byMonth.set(p.month, {
      month: p.month,
      label: p.label,
      recorded: p.recorded,
      carried: p.carried,
      projected: null,
    });
  }
  for (const p of projection) {
    const row = byMonth.get(p.month) ?? {
      month: p.month,
      label: p.label,
      recorded: null,
      carried: null,
      projected: null,
    };
    row.projected = p.projected;
    byMonth.set(p.month, row);
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/**
 * Net worth over time from saved monthly snapshots. Recorded months are a solid line; a month with
 * no check-in shows the carried-forward value as a dashed line (never colour alone), and a
 * projection, when given, is a dashed line in the projection colour.
 */
export const NetWorthHistoryChart: FC<NetWorthHistoryChartProps> = ({
  points,
  projection = [],
  summary,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const rows = mergeRows(points, projection);
  const hasCarried = points.some((p) => p.recorded === null && p.carried !== null);
  const recordedCount = points.filter((p) => p.recorded !== null).length;

  const legend: ChartLegendItem[] = [
    { id: "recorded", label: "Recorded", color: "primary", swatch: "line" },
    ...(hasCarried
      ? [
          {
            id: "carried",
            label: "Carried forward (no check-in)",
            color: "primary",
            swatch: "dashed",
          } as const,
        ]
      : []),
    ...(projection.length > 0
      ? [{ id: "projected", label: "Projection", color: "projection", swatch: "dashed" } as const]
      : []),
  ];

  return (
    <ChartFigure
      dataTable={
        <Table caption="Net worth by month">
          <THead>
            <tr>
              <Th>Month</Th>
              <Th numeric>Net worth</Th>
              <Th>Basis</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => {
              const value = r.recorded ?? r.carried ?? r.projected;
              const basis =
                r.recorded !== null
                  ? "Recorded"
                  : r.carried !== null
                    ? "Carried forward"
                    : "Projection";
              return (
                <tr key={r.month}>
                  <Th scope="row">{formatMonth(r.month)}</Th>
                  <Td numeric>{value === null ? "Not set" : formatCurrency(value)}</Td>
                  <Td>{basis}</Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      }
      hideTitle
      legend={<ChartLegend id="net-worth-history-legend" items={legend} />}
      summary={summary}
      title="Net worth over time"
    >
      <div
        className={chartWrap()}
        data-testid="net-worth-history-chart"
        id="net-worth-history-chart"
      >
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartXAxisProps} />
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
              dot={
                recordedCount <= 1
                  ? { r: 5, fill: chartColor("primary"), stroke: chartColor("primary") }
                  : false
              }
              name="Net worth"
            />
            {projection.length > 0 ? (
              <Line
                {...chartLineProps("projection", { projection: true })}
                dataKey="projected"
                name="Projection"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};

export default NetWorthHistoryChart;
