import type { RetirementAccumulationPoint, RetirementGrowthCase } from "@flump/finance-engine";
import {
  CHART_AXIS_DEFAULTS,
  ChartFigure,
  ChartLegend,
  chartColor,
  formatAxisCurrency,
  formatMoney,
  niceStep,
  Table,
  TBody,
  Td,
  THead,
  Th,
  xTickAnchor,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartCursorProps } from "~/features/charts";
import { formatEstimate } from "~/utils/roundEstimate";
import { annotationChip, annotationText, chartWrap } from "./RetirementPotChart.styles";

/** Four at most: an end-anchored last tick beside a centred one crowds at 375 with more. */
const MAX_TICKS = Math.min(4, CHART_AXIS_DEFAULTS.maxXTicks);
/** Three below this chart width (in px), so ticks never touch on a phone. */
const NARROW_WIDTH = 480;
const NARROW_MAX_TICKS = 3;
/** Most y ticks, counting £0. */
const MAX_Y_TICKS = 5;

/** Chip geometry for the annotation, in SVG units (one unit per CSS pixel). */
const CHIP_HEIGHT = 22;
const CHIP_PADDING = 8;
const CHIP_CHAR_WIDTH = 7;
/** The chip's right edge sits on the end dot's right edge (its radius), just above the dot. */
const CHIP_ANCHOR_X = 5;
const CHIP_ANCHOR_GAP = 9;

const ANNOTATION_LABEL = "Retirement";

// A Recharts numeric x-axis (ages), not a form input: kept out of the type="number" input law.
const NUMERIC_AXIS = "number" as const;

export const RETIREMENT_POT_CHART_COPY = {
  title: "Pot each year",
  paidIn: "Paid in",
  growth: "Growth",
  ageColumn: "Age",
  potColumn: "Estimated pot",
  caption: "Estimated pots by age, in today's prices",
} as const;

export interface PotChartRow {
  age: number;
  yearIndex: number;
  pot: number;
  paidIn: number;
  /** Pot minus paid in, never below £0 (a lower case can fall short of what was paid in). */
  growth: number;
}

/** One row per year for the chosen growth case: what was paid in and the growth on top. */
export const potChartRows = (
  points: readonly RetirementAccumulationPoint[],
  growthCase: RetirementGrowthCase,
): PotChartRow[] =>
  points.map((p) => {
    const pot = p.potGbp[growthCase];
    return {
      age: p.age,
      yearIndex: p.yearIndex,
      pot,
      paidIn: p.paidInGbp,
      growth: Math.max(0, pot - p.paidInGbp),
    };
  });

/**
 * Evenly spaced ticks (every 1, 2, 5, 10 or more) that end on the last value (the retirement age),
 * at most `maxTicks` of them (P10.4).
 */
export const evenTicks = (values: readonly number[], maxTicks: number = MAX_TICKS): number[] => {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined) return [];
  const span = last - first;
  const step = [1, 2, 5, 10, 15, 20, 25].find((s) => Math.floor(span / s) + 1 <= maxTicks) ?? 50;
  const ticks: number[] = [];
  for (let value = last; value >= first; value -= step) ticks.unshift(value);
  return ticks;
};

/**
 * A y axis from £0: the chart stacks two filled areas, and an axis starting near the data would
 * make the growth look larger than it is.
 */
export const zeroBasedAxis = (max: number): { domain: [number, number]; ticks: number[] } => {
  const top = Number.isFinite(max) && max > 0 ? max : 1;
  let step = niceStep(top / 4);
  while (Math.ceil(top / step) + 1 > MAX_Y_TICKS) step = niceStep(step * 1.5);
  const end = Math.ceil(top / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= end + step / 1e6; v += step) ticks.push(Math.round(v));
  return { domain: [0, end], ticks };
};

const exact = (n: number) => formatMoney(Math.round(n), { fractionDigits: 0 }).text;
/** Today's row is a saved figure; every later year is an estimate, rounded with "~". */
const yearFigure = (n: number, yearIndex: number) =>
  yearIndex === 0 ? exact(n) : formatEstimate(n);

export interface RetirementPotChartProps {
  /** The engine's year-by-year counted pots, from today to the retirement age. */
  points: readonly RetirementAccumulationPoint[];
  growthCase: RetirementGrowthCase;
}

/**
 * The counted pots each year up to retirement for one growth case, in today's prices: what is paid
 * in and the growth on top, stacked, with one annotation at retirement (E16 P10). The year-by-year
 * table sits behind the quiet "Show data" button.
 */
export const RetirementPotChart: FC<RetirementPotChartProps> = ({ points, growthCase }) => {
  const rows = useMemo(() => potChartRows(points, growthCase), [points, growthCase]);
  // The chart's own width decides the tick count (read from ResponsiveContainer's resize).
  const [narrow, setNarrow] = useState(false);
  const maxTicks = narrow ? NARROW_MAX_TICKS : MAX_TICKS;
  const ticks = evenTicks(
    rows.map((r) => r.age),
    maxTicks,
  );
  const last = rows[rows.length - 1];
  const yAxis = useMemo(
    () => zeroBasedAxis(Math.max(0, ...rows.map((r) => r.paidIn + r.growth))),
    [rows],
  );

  return (
    <ChartFigure
      annotation={last ? { x: last.age, label: ANNOTATION_LABEL } : undefined}
      dataTable={
        <Table caption={RETIREMENT_POT_CHART_COPY.caption}>
          <THead>
            <tr>
              <Th>{RETIREMENT_POT_CHART_COPY.ageColumn}</Th>
              <Th numeric>{RETIREMENT_POT_CHART_COPY.potColumn}</Th>
              <Th numeric>{RETIREMENT_POT_CHART_COPY.paidIn}</Th>
              <Th numeric>{RETIREMENT_POT_CHART_COPY.growth}</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <tr key={row.age}>
                <Th scope="row">{row.age}</Th>
                <Td numeric>{yearFigure(row.pot, row.yearIndex)}</Td>
                <Td numeric>{yearFigure(row.paidIn, row.yearIndex)}</Td>
                <Td numeric>{yearFigure(row.growth, row.yearIndex)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      }
      legend={
        <ChartLegend
          items={[
            {
              id: "paid-in",
              label: RETIREMENT_POT_CHART_COPY.paidIn,
              color: "primary",
              swatch: "area",
            },
            {
              id: "growth",
              label: RETIREMENT_POT_CHART_COPY.growth,
              color: "wealth",
              swatch: "area",
            },
          ]}
        />
      }
      maxTicks={maxTicks}
      pointCount={rows.length}
      // One visible line under the title with one figure (P10.1).
      summary={
        last
          ? `Reaches ${formatEstimate(last.pot)} at retirement, in today's prices.`
          : "Your estimated pots each year to retirement, in today's prices."
      }
      title={RETIREMENT_POT_CHART_COPY.title}
    >
      <div className={chartWrap()}>
        <ResponsiveContainer
          height="100%"
          width="100%"
          onResize={(width) => setNarrow(width > 0 && width < NARROW_WIDTH)}
        >
          <AreaChart
            data={rows}
            margin={{ top: 36, right: CHART_AXIS_DEFAULTS.plotPaddingRight, left: -8, bottom: 0 }}
          >
            <XAxis
              axisLine={false}
              dataKey="age"
              domain={["dataMin", "dataMax"]}
              tick={({ x, y, payload, index }) => (
                <text
                  className="recharts-cartesian-axis-tick-value"
                  dy={16}
                  textAnchor={xTickAnchor(index, ticks.length)}
                  x={x}
                  y={y}
                >
                  {payload.value}
                </text>
              )}
              tickLine={false}
              ticks={ticks}
              type={NUMERIC_AXIS}
            />
            <YAxis
              axisLine={false}
              domain={yAxis.domain}
              interval={0}
              tickFormatter={(val) => formatAxisCurrency(Number(val))}
              tickLine={false}
              tickMargin={8}
              ticks={yAxis.ticks}
            />
            <Tooltip
              cursor={chartCursorProps}
              formatter={(value, _name, item) =>
                yearFigure(Number(value) || 0, Number(item?.payload?.yearIndex) || 0)
              }
              labelFormatter={(label) => `Age ${String(label)}`}
              separator=": "
            />
            {/* Dashed edges: every year after today is an estimate (P10). */}
            <Area
              dataKey="paidIn"
              fill={chartColor("primary")}
              fillOpacity={0.35}
              isAnimationActive={false}
              name={RETIREMENT_POT_CHART_COPY.paidIn}
              stackId="pot"
              stroke={chartColor("primary")}
              strokeDasharray="6 4"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="growth"
              fill={chartColor("wealth")}
              fillOpacity={0.35}
              isAnimationActive={false}
              name={RETIREMENT_POT_CHART_COPY.growth}
              stackId="pot"
              stroke={chartColor("wealth")}
              strokeDasharray="6 4"
              strokeWidth={2}
              type="monotone"
            />
            {last ? (
              <ReferenceDot
                fill={chartColor("primary")}
                // A small chip whose right edge lines up with the end dot, just above it (P10.3).
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = (viewBox?.x ?? 0) + CHIP_ANCHOR_X;
                  const y = (viewBox?.y ?? 0) - CHIP_ANCHOR_GAP;
                  const width = ANNOTATION_LABEL.length * CHIP_CHAR_WIDTH + CHIP_PADDING * 2;
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
                        {ANNOTATION_LABEL}
                      </text>
                    </g>
                  );
                }}
                r={5}
                stroke="none"
                x={last.age}
                y={last.paidIn + last.growth}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};

export default RetirementPotChart;
