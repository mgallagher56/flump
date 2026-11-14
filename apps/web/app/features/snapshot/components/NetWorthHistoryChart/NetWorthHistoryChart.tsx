import { ChartFigure, Table, TBody, Td, THead, Th } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { ChartDataRow } from "~/components/charts/ChartDataRow";
import { MonthLinePlot } from "~/components/charts/MonthLinePlot";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatMonth, type HistoryChartPoint } from "../../snapshotModel";
import { chartStack } from "./NetWorthHistoryChart.styles";

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
   * Quiet links in one row with "Show data" (for example "Add earlier months"), each a
   * `Button variant="link"`, so every link under the chart lines up and looks the same.
   */
  dataActions?: ReactNode;
  /** One line of quiet text under that row ("Next check-in: 1 December 2026"). */
  dataNote?: ReactNode;
}

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
  dataNote,
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
        note={dataNote}
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
