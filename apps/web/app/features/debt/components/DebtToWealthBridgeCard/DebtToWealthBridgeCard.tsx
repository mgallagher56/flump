import {
  bridgePayoffMonth,
  calculateDebtToWealthBridge,
  type DebtItem,
} from "@flump/finance-engine";
import {
  ChartFigure,
  chartColor,
  FormField,
  formatAxisCurrency,
  KpiCard,
  KpiStrip,
  Money,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  bridgeCard,
  bridgeHeader,
  bridgeHeaderText,
  cardHeading,
  cardSubtitle,
  chartLegend,
  chartLegendItem,
  chartWrap,
  dataCell,
  dataTable,
  legendSwatch,
  nativeSelect,
  projectionChip,
  rateControl,
  stateNote,
  textValue,
} from "./DebtToWealthBridgeCard.styles";

export interface DebtToWealthBridgeCardProps {
  debts: DebtItem[];
  extraPayment: number;
  /** The payoff order picked on the left, so the cleared month matches its card. */
  strategy?: "avalanche" | "snowball";
  className?: string;
}

/** Growth rates the user can pick, as a yearly percentage. The first is the starting assumption. */
export const GROWTH_RATE_OPTIONS = [
  { rate: 4.5, label: "Cash ISA" },
  { rate: 6, label: "Balanced stocks and shares ISA" },
  { rate: 7.5, label: "Global equities stocks and shares ISA" },
] as const;

const rateFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const DebtToWealthBridgeCard: FC<DebtToWealthBridgeCardProps> = ({
  debts,
  extraPayment,
  strategy = "avalanche",
  className,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const gradientId = `debt-bridge-${useId().replace(/:/g, "")}`;
  const [returnRate, setReturnRate] = useState<number>(GROWTH_RATE_OPTIONS[0].rate);
  const rateOption = GROWTH_RATE_OPTIONS.find((o) => o.rate === returnRate);

  const bridgePoints = useMemo(
    () =>
      calculateDebtToWealthBridge(
        debts,
        extraPayment,
        returnRate,
        5,
        strategy === "snowball" ? "SNOWBALL" : "AVALANCHE",
      ),
    [debts, extraPayment, returnRate, strategy],
  );

  // The engine's payoff month: the same schedule as the payoff-order cards, never a sampled point.
  const clearedMonth = bridgePayoffMonth(bridgePoints);
  const clearedPoint = clearedMonth === null ? undefined : { month: clearedMonth };
  const finalPoint = bridgePoints[bridgePoints.length - 1];
  const totalMonthlyCommitment = debts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraPayment;

  const chartData = useMemo(
    () =>
      bridgePoints.map((pt) => ({
        name: `Mo ${pt.month}`,
        debt: pt.debtRemaining,
        wealth: pt.wealthAccumulated,
      })),
    [bridgePoints],
  );

  const wealth = clearedPoint ? (finalPoint?.wealthAccumulated ?? 0) : null;

  return (
    <section aria-labelledby="debt-bridge-heading" className={cx(bridgeCard(), className)}>
      <div className={bridgeHeader()}>
        <div className={bridgeHeaderText}>
          <h3 className={cardHeading} id="debt-bridge-heading">
            What if the money that clears your debts went into savings instead?
          </h3>
          <p className={cardSubtitle}>
            When your debts are cleared, the monthly payment you were making is no longer needed.
            This shows what that payment could grow to if it were saved.
          </p>
        </div>
        <div className={rateControl}>
          <FormField label="Assumed growth a year">
            {(field) => (
              <select
                className={nativeSelect()}
                id={field.id}
                value={String(returnRate)}
                onChange={(e) => setReturnRate(Number(e.target.value))}
              >
                {GROWTH_RATE_OPTIONS.map((o) => (
                  <option key={o.rate} value={String(o.rate)}>
                    {rateFormat.format(o.rate)}% ({o.label})
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </div>

      <KpiStrip columns={3}>
        <KpiCard
          label="Paid towards debts each month"
          subtext="Minimum payments plus your extra payment"
          value={<Money size="lg" value={totalMonthlyCommitment} />}
        />
        <KpiCard
          label="Debts cleared after"
          subtext={clearedPoint ? "Projection" : "Not cleared within the projection"}
          value={
            clearedPoint ? (
              <span className={textValue}>
                {clearedPoint.month} {clearedPoint.month === 1 ? "month" : "months"}
              </span>
            ) : null
          }
        />
        <KpiCard
          label="Saved 5 years after that"
          subtext="Projection, not a forecast"
          value={wealth === null ? null : <Money size="lg" value={wealth} />}
        />
      </KpiStrip>

      <ChartFigure
        dataTable={
          <table className={dataTable()}>
            <caption>Debt remaining and savings built up over time</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Debt remaining</th>
                <th scope="col">Savings built up</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.name}>
                  <th className={dataCell} scope="row">
                    {row.name}
                  </th>
                  <td className={dataCell}>{formatCurrency(row.debt)}</td>
                  <td className={dataCell}>{formatCurrency(row.wealth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        summary={
          clearedPoint
            ? `Debt-free after ${clearedPoint.month} months. By the end of the projection, ${formatCurrency(finalPoint?.wealthAccumulated ?? 0)} is accumulated in an ISA at ${rateFormat.format(returnRate)}% a year.`
            : "Debt is not cleared within the projection, so no wealth is accumulated in an ISA."
        }
        hideTitle
        title="Debt-to-wealth crossover"
      >
        <div className={chartLegend()}>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "debt" })} />
            Debt remaining (solid)
          </span>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "wealth" })} />
            Savings built up (dashed)
          </span>
          <span className={projectionChip()}>Projection</span>
        </div>
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("debt")} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={chartColor("debt")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="name"
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={28}
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
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                dataKey="debt"
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                name="Debt remaining"
                stroke={chartColor("debt")}
                strokeWidth={3}
                type="monotone"
              />
              <Area
                dataKey="wealth"
                fill="none"
                isAnimationActive={false}
                name="Savings built up"
                stroke={chartColor("wealth")}
                strokeDasharray="7 6"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className={stateNote}>
          Assumes {rateFormat.format(returnRate)}% a year
          {rateOption ? ` (${rateOption.label})` : ""}, a rate you can change above. Projection, not
          a forecast.
        </p>
      </ChartFigure>
    </section>
  );
};

export default DebtToWealthBridgeCard;
