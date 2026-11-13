import { ChartFigure, chartColor, formatAxisCurrency, Table, TBody, Td, THead, Th } from "@repo/ui";
import { type FC, useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { type ForecastResult, INFLATION_RATE, SAFE_WITHDRAWAL_RATE } from "../../forecast";
import {
  chartAssumption,
  chartHeading,
  chartLegend,
  chartLegendItem,
  chartPanel,
  chartWrap,
  legendSwatch,
} from "./ForecastChart.styles";

export interface ForecastChartProps {
  result: ForecastResult;
  horizonYears: number;
  growthRate: number;
  adjustForInflation: boolean;
}

/**
 * Projected pot by year: contributions and growth stacked, with the projected total as a dashed
 * line. A projection, so it is dashed and its assumptions are stated beside it.
 */
export const ForecastChart: FC<ForecastChartProps> = ({
  result,
  horizonYears,
  growthRate,
  adjustForInflation,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const uid = useId().replace(/:/g, "");
  const gradContribs = `pension-contribs-${uid}`;
  const gradGrowth = `pension-growth-${uid}`;
  const { chartData } = result;

  return (
    <section aria-labelledby={`pension-chart-heading-${uid}`} className={chartPanel()}>
      <div>
        <h3 className={chartHeading()} id={`pension-chart-heading-${uid}`}>
          Retirement projection
        </h3>
        <p className={chartAssumption()}>
          Assumes {growthRate}% a year growth
          {adjustForInflation ? ` after ${INFLATION_RATE}% inflation` : ""} and a{" "}
          {SAFE_WITHDRAWAL_RATE * 100}% drawdown; projection, not a forecast.
        </p>
      </div>

      <ChartFigure
        dataTable={
          <Table caption="Projected pension pot by year">
            <THead>
              <tr>
                <Th>Year</Th>
                <Th numeric>Total pot</Th>
                <Th numeric>Contributions</Th>
                <Th numeric>Investment growth</Th>
              </tr>
            </THead>
            <TBody>
              {chartData.map((row) => (
                <tr key={row.year}>
                  <Th scope="row">{row.year}</Th>
                  <Td numeric>{formatCurrency(row.totalPot)}</Td>
                  <Td numeric>{formatCurrency(row.totalContribs)}</Td>
                  <Td numeric>{formatCurrency(row.growth)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        }
        summary={`Projected pension pot after ${horizonYears} years: ${formatCurrency(result.finalBalance)}, with ${formatCurrency(result.totalEmployeeContribs + result.totalEmployerContribs)} contributed over the period and ${formatCurrency(result.totalGrowth)} of investment growth.`}
        hideTitle
        title="Pension pot projection"
      >
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradContribs} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("primary")} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor("primary")} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id={gradGrowth} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("wealth")} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartColor("wealth")} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="year"
                fontSize={11}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                fontSize={11}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
              <Area
                dataKey="totalContribs"
                fill={`url(#${gradContribs})`}
                isAnimationActive={false}
                name="Paid in"
                stackId="pot"
                stroke={chartColor("primary")}
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="growth"
                fill={`url(#${gradGrowth})`}
                isAnimationActive={false}
                name="Investment growth"
                stackId="pot"
                stroke={chartColor("wealth")}
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="totalPot"
                fill="none"
                isAnimationActive={false}
                name="Projected total"
                stroke={chartColor("projection")}
                strokeDasharray="6 4"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={chartLegend()}>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "contributions" })} />
            Paid in
          </span>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "growth" })} />
            Investment growth
          </span>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "projection" })} />
            Projected total (dashed)
          </span>
        </div>
      </ChartFigure>
    </section>
  );
};

export default ForecastChart;
