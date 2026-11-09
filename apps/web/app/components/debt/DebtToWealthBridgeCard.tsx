import { calculateDebtToWealthBridge, type DebtItem } from "@repo/common";
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
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface DebtToWealthBridgeCardProps {
  debts: DebtItem[];
  extraPayment: number;
}

const cardStyle = css({
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

const metricsRowStyle = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    sm: "repeat(3, 1fr)",
  },
  gap: "16px",
  backgroundColor: "rgba(16, 185, 129, 0.05)",
  border: "1px solid",
  borderColor: "rgba(16, 185, 129, 0.2)",
  padding: "16px",
  borderRadius: "xl",
});

const chartTableStyle = css({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
  "& th": {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "1px solid",
    borderColor: "border",
    color: "text.muted",
    fontWeight: "600",
  },
  "& td": {
    padding: "8px 12px",
    borderBottom: "1px solid",
    borderColor: "border",
  },
});

export const DebtToWealthBridgeCard: FC<DebtToWealthBridgeCardProps> = ({
  debts,
  extraPayment,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [returnRate, setReturnRate] = useState<number>(6.0);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);

  const bridgePoints = useMemo(() => {
    return calculateDebtToWealthBridge(debts, extraPayment, returnRate, 5);
  }, [debts, extraPayment, returnRate]);

  const debtFreePoint = bridgePoints.find((p) => p.isPostDebtFree) || bridgePoints[0];
  const finalPoint = bridgePoints[bridgePoints.length - 1];
  const totalMonthlyCommitment = debts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraPayment;

  // Filter key milestones if not showing all
  const displayedPoints = useMemo(() => {
    if (showAllRows || bridgePoints.length <= 8) return bridgePoints;
    const debtFreeMonth = debtFreePoint?.month ?? 1;
    const keyMonthSet = new Set<number>([
      1,
      Math.max(1, Math.round(debtFreeMonth / 2)),
      debtFreeMonth,
      debtFreeMonth + 12,
      debtFreeMonth + 36,
      bridgePoints[bridgePoints.length - 1]?.month ?? 60,
    ]);
    return bridgePoints.filter((pt) => keyMonthSet.has(pt.month));
  }, [bridgePoints, debtFreePoint, showAllRows]);

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
                backgroundColor: "var(--colors-background)",
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
            <FLPHeading as="h4" size="lg">
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
            <FLPHeading as="h4" color="primary" size="lg">
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
            <FLPHeading as="h4" color="green.600" size="lg">
              +{formatCurrency(finalPoint?.wealthAccumulated || 0)}
            </FLPHeading>
            <FLPText color="green.700" fontSize="xs">
              Invested in a tax-sheltered ISA
            </FLPText>
          </div>
        </div>

        {/* Primary Visual Chart: Crossover Area Chart */}
        <div style={{ width: "100%", height: 260, marginTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                formatter={(val: any, name: any) => [
                  formatCurrency(Number(val)),
                  name === "debt" ? "Debt Remaining" : "Wealth in ISA",
                ]}
              />
              <Area
                type="monotone"
                dataKey="debt"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#debtGradient)"
                name="debt"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="wealth"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#wealthGradient)"
                name="wealth"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Visual Progress Milestones Table */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <FLPText fontSize="xs" color="text.muted" fontWeight="semibold">
              {showAllRows
                ? `Showing all ${bridgePoints.length} monthly steps`
                : "Key milestone timeline"}
            </FLPText>
            {bridgePoints.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                style={{
                  fontSize: "12px",
                  color: "var(--colors-primary)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "2px 4px",
                }}
              >
                {showAllRows
                  ? "Show key milestones only"
                  : `Show all ${bridgePoints.length} months`}
              </button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={chartTableStyle}>
              <thead>
                <tr>
                  <th>Timeline</th>
                  <th>Phase</th>
                  <th>Debt Remaining</th>
                  <th>Wealth in ISA</th>
                  <th>Net Balance Trajectory</th>
                </tr>
              </thead>
              <tbody>
                {displayedPoints.map((point) => (
                  <tr
                    key={point.month}
                    style={
                      point.isPostDebtFree && point.debtRemaining === 0
                        ? { backgroundColor: "rgba(16, 185, 129, 0.04)" }
                        : undefined
                    }
                  >
                    <td style={{ fontWeight: "500" }}>
                      Month {point.month} (Yr {point.yearNumber})
                    </td>
                    <td>
                      {point.isPostDebtFree ? (
                        <span
                          style={{
                            fontSize: "12px",
                            backgroundColor: "var(--colors-success-bg)",
                            color: "var(--colors-success-DEFAULT)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "bold",
                          }}
                        >
                          Wealth building
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            backgroundColor: "var(--colors-destructive-bg)",
                            color: "var(--colors-destructive-DEFAULT)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "bold",
                          }}
                        >
                          Debt clearance
                        </span>
                      )}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{
                        color:
                          point.debtRemaining > 0
                            ? "var(--colors-destructive-500)"
                            : "var(--colors-success-500)",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(point.debtRemaining)}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{ color: "var(--colors-success-500)", fontWeight: "600" }}
                    >
                      {point.wealthAccumulated > 0
                        ? `+${formatCurrency(point.wealthAccumulated)}`
                        : "£0"}
                    </td>
                    <td className="tabular-nums">
                      {point.debtRemaining > 0 ? (
                        <span style={{ color: "var(--colors-destructive-500)" }}>
                          -{formatCurrency(point.debtRemaining)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--colors-success-500)", fontWeight: "bold" }}>
                          +{formatCurrency(point.wealthAccumulated)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FLPCard>
  );
};

export default DebtToWealthBridgeCard;
