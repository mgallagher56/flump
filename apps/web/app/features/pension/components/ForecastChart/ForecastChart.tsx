import { ChartFigure, chartColor, formatAxisCurrency, Table, TBody, Td, THead, Th } from "@repo/ui";
import { type FC, useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { ForecastResult } from "../../forecast";
import { annotationChip, annotationText, chartWrap } from "./ForecastChart.styles";

const MAX_TICKS = 6;

/** Chip geometry for the annotation, in SVG units (one unit per CSS pixel). */
const CHIP_HEIGHT = 22;
const CHIP_PADDING = 8;
const CHIP_CHAR_WIDTH = 7;

/**
 * Evenly spaced year ticks (every 1, 2, 5, 10 or 20 years) that end on the retirement year,
 * at most `MAX_TICKS` of them (P10.4).
 */
export const evenYearTicks = (years: readonly number[]): number[] => {
  const first = years[0];
  const last = years[years.length - 1];
  if (first === undefined || last === undefined) return [];
  const span = last - first;
  const step = [1, 2, 5, 10, 20].find((s) => Math.floor(span / s) + 1 <= MAX_TICKS) ?? 50;
  const ticks: number[] = [];
  for (let year = last; year >= first; year -= step) ticks.unshift(year);
  return ticks;
};

// A Recharts numeric x-axis (years), not a form input: kept out of the type="number" input law.
const NUMERIC_AXIS = "number" as const;

export interface ForecastChartProps {
  result: ForecastResult;
  adjustForInflation: boolean;
  /** "at 67" or "in 25 years": when the pot is drawn on. */
  whenLabel: string;
  /** Short annotation at the last point, for example "Retire at 67". */
  annotationLabel: string;
}

/**
 * The estimated pot each year up to retirement: one dashed series (an estimate), calendar years on
 * the axis, and one annotation at the retirement point (E16 P10). The year-by-year table sits
 * behind the quiet "Show data" button.
 */
export const ForecastChart: FC<ForecastChartProps> = ({
  result,
  adjustForInflation,
  whenLabel,
  annotationLabel,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const startYear = new Date().getFullYear();
  const points = useMemo(
    () =>
      result.chartData.map((p) => ({
        ...p,
        calendarYear: startYear + p.yearIndex,
      })),
    [result.chartData, startYear],
  );
  const ticks = evenYearTicks(points.map((p) => p.calendarYear));
  const last = points[points.length - 1];
  // "to 67" or "for 25 years": short, so the summary fits one line at 375.
  const span = whenLabel.startsWith("at ")
    ? `to ${whenLabel.slice(3)}`
    : whenLabel.startsWith("in ")
      ? `for ${whenLabel.slice(3)}`
      : whenLabel;

  return (
    <div>
      <ChartFigure
        annotation={last ? { x: last.calendarYear, label: annotationLabel } : undefined}
        dataTable={
          <Table caption="Estimated pension pot by year">
            <THead>
              <tr>
                <Th>Year</Th>
                <Th numeric>Estimated pot</Th>
                <Th numeric>Paid in</Th>
                <Th numeric>Investment growth</Th>
              </tr>
            </THead>
            <TBody>
              {points.map((row) => (
                <tr key={row.calendarYear}>
                  <Th scope="row">{row.calendarYear}</Th>
                  <Td numeric>{formatCurrency(row.totalPot)}</Td>
                  <Td numeric>{formatCurrency(row.totalContribs)}</Td>
                  <Td numeric>{formatCurrency(row.growth)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        }
        maxTicks={MAX_TICKS}
        pointCount={points.length}
        summary={
          adjustForInflation
            ? `Your pot each year ${span}, in today's money.`
            : `Your pot each year ${span}, before inflation.`
        }
        title="Estimated pension pot"
      >
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={points} margin={{ top: 36, right: 16, left: -8, bottom: 0 }}>
              <XAxis
                axisLine={false}
                dataKey="calendarYear"
                fontSize={11}
                tickLine={false}
                tickMargin={8}
                ticks={ticks}
                type={NUMERIC_AXIS}
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                axisLine={false}
                fontSize={11}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value) || 0)}
                labelFormatter={(label) => String(label)}
              />
              <Area
                dataKey="totalPot"
                fill={chartColor("band")}
                fillOpacity={0.4}
                isAnimationActive={false}
                name="Estimated pot"
                stroke={chartColor("primary")}
                strokeDasharray="6 4"
                strokeWidth={2}
                type="monotone"
              />
              {last ? (
                <ReferenceDot
                  fill={chartColor("primary")}
                  // Above and left of the end dot on a small chip, so it never sits on the line
                  // or clips at the right edge (P10.3).
                  label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                    const x = (viewBox?.x ?? 0) - 6;
                    const y = (viewBox?.y ?? 0) - 8;
                    const width = annotationLabel.length * CHIP_CHAR_WIDTH + CHIP_PADDING * 2;
                    return (
                      <g>
                        <rect
                          className={annotationChip()}
                          height={CHIP_HEIGHT}
                          rx={CHIP_HEIGHT / 2}
                          width={width}
                          x={x - width}
                          y={y - CHIP_HEIGHT}
                        />
                        <text
                          className={annotationText()}
                          dominantBaseline="middle"
                          textAnchor="end"
                          x={x - CHIP_PADDING}
                          y={y - CHIP_HEIGHT / 2}
                        >
                          {annotationLabel}
                        </text>
                      </g>
                    );
                  }}
                  r={5}
                  stroke="none"
                  x={last.calendarYear}
                  y={last.totalPot}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartFigure>
    </div>
  );
};

export default ForecastChart;
