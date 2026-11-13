import { calculateDebtToWealthBridge, type DebtItem } from "@flump/finance-engine";
import { ChartFigure } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "~/components/charts/chartTheme";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface DebtToWealthBridgeCardProps {
  debts: DebtItem[];
  extraPayment: number;
}

const cardStyle = css({
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  height: "100%",
});

const metricsRowStyle = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    sm: "repeat(3, 1fr)",
  },
  gap: "12px",
  backgroundColor: "surface.sunken",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "16px",
  borderRadius: "xl",
});

export const DebtToWealthBridgeCard: FC<DebtToWealthBridgeCardProps> = ({
  debts,
  extraPayment,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [returnRate, setReturnRate] = useState<number>(6.0);

  const bridgePoints = useMemo(() => {
    return calculateDebtToWealthBridge(debts, extraPayment, returnRate, 5);
  }, [debts, extraPayment, returnRate]);

  const firstPostDebtFree = bridgePoints.find((p) => p.isPostDebtFree);
  const lastPreDebtFree = [...bridgePoints].reverse().find((p) => !p.isPostDebtFree);
  // The engine caps the schedule, so a post-debt-free point alone does not prove the debt cleared.
  const clearedPoint =
    firstPostDebtFree && (lastPreDebtFree?.debtRemaining ?? 0) === 0
      ? firstPostDebtFree
      : undefined;
  const debtFreePoint = clearedPoint || bridgePoints[0];
  const finalPoint = bridgePoints[bridgePoints.length - 1];
  const totalMonthlyCommitment = debts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraPayment;

  // Chart data points
  const chartData = useMemo(() => {
    return bridgePoints.map((pt) => ({
      name: `Mo ${pt.month}`,
      debt: pt.debtRemaining,
      wealth: pt.wealthAccumulated,
    }));
  }, [bridgePoints]);

  return (
    <FLPCard>
      <div className={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FLPHeading as="h3" size="xl">
                The Debt-to-Wealth Crossover Bridge
              </FLPHeading>
            </div>
            <FLPText color="text.muted" fontSize="sm">
              The real financial breakthrough happens when you hit £0. Redirecting that exact
              monthly payment into an ISA creates exponential wealth.
            </FLPText>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FLPText fontSize="xs">Projected ISA Growth Rate:</FLPText>
            <select
              aria-label="Projected ISA Return Rate"
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--colors-border)",
                backgroundColor: "var(--colors-surface-canvas)",
                fontSize: "12px",
              }}
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
            >
              <option value="4.5">4.5% (Cash ISA)</option>
              <option value="6.0">6.0% (Balanced S&S ISA)</option>
              <option value="7.5">7.5% (Global Equities S&S ISA)</option>
            </select>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className={metricsRowStyle}>
          <div>
            <FLPText color="text.muted" fontSize="xs">
              Current Monthly Debt Outflow
            </FLPText>
            <FLPHeading as="h4" size="lg" className={css({ fontVariantNumeric: "tabular-nums" })}>
              {formatCurrency(totalMonthlyCommitment)}/mo
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              Freed up automatically post-payoff
            </FLPText>
          </div>

          <div>
            <FLPText color="text.muted" fontSize="xs">
              Projected Debt-Free Point
            </FLPText>
            <FLPHeading
              as="h4"
              color="primary"
              size="lg"
              className={css({ fontVariantNumeric: "tabular-nums" })}
            >
              Year {debtFreePoint?.yearNumber || 0}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              Liabilities drop to £0
            </FLPText>
          </div>

          <div>
            <FLPText color="text.muted" fontSize="xs">
              Accumulated Wealth (5 Yrs Post Debt-Free)
            </FLPText>
            <FLPHeading
              as="h4"
              color="status.positive.text"
              size="lg"
              className={css({ fontVariantNumeric: "tabular-nums" })}
            >
              +{formatCurrency(finalPoint?.wealthAccumulated || 0)}
            </FLPHeading>
            <FLPText color="status.positive.text" fontSize="xs">
              Invested in a tax-sheltered ISA
            </FLPText>
          </div>
        </div>

        {/* Primary Visual Chart: Crossover Area Chart */}
        <ChartFigure
          dataTable={
            <table>
              <caption>Debt remaining and wealth accumulated over time</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Debt remaining</th>
                  <th scope="col">Wealth accumulated</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(row.debt)}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(row.wealth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          summary={
            clearedPoint
              ? `Debt-free after ${clearedPoint.month} months. By the end of the projection, ${formatCurrency(finalPoint?.wealthAccumulated || 0)} is accumulated in an ISA at ${returnRate}% a year.`
              : "Debt is not cleared within the projection, so no wealth is accumulated in an ISA."
          }
          hideTitle
          title="Debt-to-wealth crossover"
        >
          <div style={{ width: "100%", height: 260, marginTop: "8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--colors-status-danger-text)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--colors-status-danger-text)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--colors-chart-wealth)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--colors-chart-wealth)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  tickLine={false}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  fontSize={11}
                  tickFormatter={(val) => `£${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
                  formatter={(val: any, name: any) => [
                    formatCurrency(Number(val)),
                    name === "debt" ? "Debt Remaining" : "Wealth in ISA",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="debt"
                  stroke="var(--colors-status-danger-text)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#debtGradient)"
                  name="debt"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="wealth"
                  stroke="var(--colors-chart-wealth)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#wealthGradient)"
                  name="wealth"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartFigure>
      </div>
    </FLPCard>
  );
};

export default DebtToWealthBridgeCard;
