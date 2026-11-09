import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { FaChartArea, FaCheckCircle, FaFlagCheckered, FaPercent, FaUndo } from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPCheckbox from "~/components/core/inputs/checkbox/FLPCheckbox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface SavingsForecasterCardProps {
  startingBalance: number;
  monthlyContribution: number;
  portfolioInterestRate: number;
  accounts?: Account[];
}

const cardStyle = css({
  padding: "18px 20px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

const statsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "lg",
  backgroundColor: "rgba(0, 0, 0, 0.02)",
  border: "1px solid",
  borderColor: "border",
});

const milestoneCardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: "8px 12px",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
});

export const SavingsForecasterCard: FC<SavingsForecasterCardProps> = ({
  startingBalance,
  monthlyContribution,
  portfolioInterestRate,
  accounts = [],
}) => {
  const { formatCurrency, symbol = "£" } = useFormatCurrency();

  const numericPortfolioRate = Number(portfolioInterestRate) || 0;
  const defaultRate = numericPortfolioRate > 0 ? Number(numericPortfolioRate.toFixed(2)) : 5.0;

  const [interestRate, setInterestRate] = useState<number>(defaultRate);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(false);
  const [horizonYears, setHorizonYears] = useState<number>(15);
  const [customGoalInput, setCustomGoalInput] = useState<string>("");

  useEffect(() => {
    if (!isCustomRate && numericPortfolioRate > 0) {
      setInterestRate(Number(numericPortfolioRate.toFixed(2)));
    }
  }, [numericPortfolioRate, isCustomRate]);

  const inflationDiscount = adjustForInflation ? 2.5 : 0;
  const effectiveScenarioRate = Math.max(0, interestRate - inflationDiscount);

  // Compound Interest Calculation (Per-account when using portfolio rate, or uniform when custom override)
  const { projectionData, finalTotal, totalContributed, totalInterestEarned } = useMemo(() => {
    const data = [];
    const usePerAccount = !isCustomRate && accounts.length > 0;

    let cashOnly = startingBalance;
    let accountBalances = usePerAccount
      ? accounts.map((acc) => ({
          balance: Number(acc.balance) || 0,
          monthly: Number(acc.monthlyContribution) || 0,
          monthlyRate: Math.max(0, (Number(acc.interestRate) || 0) - inflationDiscount) / 100 / 12,
        }))
      : [];

    let uniformBalance = startingBalance;
    const uniformMonthlyRate = effectiveScenarioRate / 100 / 12;

    data.push({
      year: 0,
      yearLabel: "Today",
      "Total Forecast": Math.round(startingBalance),
      "Cash Contributions": Math.round(cashOnly),
      "Interest Earned": 0,
    });

    for (let y = 1; y <= horizonYears; y++) {
      for (let m = 1; m <= 12; m++) {
        if (usePerAccount) {
          accountBalances = accountBalances.map((item) => ({
            ...item,
            balance: item.balance * (1 + item.monthlyRate) + item.monthly,
          }));
        } else {
          uniformBalance = uniformBalance * (1 + uniformMonthlyRate) + monthlyContribution;
        }
        cashOnly += monthlyContribution;
      }

      const currentTotal = usePerAccount
        ? accountBalances.reduce((s, item) => s + item.balance, 0)
        : uniformBalance;
      const interestSoFar = Math.max(0, currentTotal - cashOnly);

      data.push({
        year: y,
        yearLabel: `Year ${y}`,
        "Total Forecast": Math.round(currentTotal),
        "Cash Contributions": Math.round(cashOnly),
        "Interest Earned": Math.round(interestSoFar),
      });
    }

    const finalVal = usePerAccount
      ? accountBalances.reduce((s, item) => s + item.balance, 0)
      : uniformBalance;
    const contVal = cashOnly;
    const intVal = Math.max(0, finalVal - contVal);

    return {
      projectionData: data,
      finalTotal: finalVal,
      totalContributed: contVal,
      totalInterestEarned: intVal,
    };
  }, [
    startingBalance,
    monthlyContribution,
    effectiveScenarioRate,
    horizonYears,
    isCustomRate,
    accounts,
    inflationDiscount,
  ]);

  // Milestone Calculations: Time to reach targets
  const milestones = useMemo(() => {
    const baseTargets = [10000, 25000, 50000, 100000, 250000, 1000000];
    const customTargetNum = Number(customGoalInput);
    const hasCustomGoal = Number.isFinite(customTargetNum) && customTargetNum > 0;

    const targets = hasCustomGoal
      ? [customTargetNum, ...baseTargets.filter((t) => t !== customTargetNum)].slice(0, 6)
      : baseTargets;

    const monthlyRate = effectiveScenarioRate / 100 / 12;

    return targets.map((target, idx) => {
      const isCustom = hasCustomGoal && idx === 0;
      if (startingBalance >= target) {
        return { target, isCustom, achieved: true, years: 0, months: 0 };
      }
      if (monthlyContribution <= 0 && effectiveScenarioRate <= 0) {
        return { target, isCustom, achieved: false, years: Infinity, months: Infinity };
      }

      let b = startingBalance;
      let months = 0;
      const maxMonths = 12 * 60; // cap 60 years

      while (b < target && months < maxMonths) {
        b = b * (1 + monthlyRate) + monthlyContribution;
        months++;
      }

      if (months >= maxMonths) {
        return { target, isCustom, achieved: false, years: Infinity, months: Infinity };
      }

      return {
        target,
        isCustom,
        achieved: false,
        years: Math.floor(months / 12),
        months: months % 12,
        totalMonths: months,
      };
    });
  }, [startingBalance, monthlyContribution, effectiveScenarioRate, customGoalInput]);

  return (
    <FLPCard className={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaChartArea style={{ color: "#6363f1", fontSize: "18px" }} />
            <FLPHeading as="h4" size="md">
              Compound Interest Growth Forecaster
            </FLPHeading>
          </div>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
            Model how your current balance and monthly deposits multiply over time with compound
            interest.
          </FLPText>
        </div>

        {/* Small Inputs: Interest Rate Scenario, Inflation Toggle & Horizon */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="forecast-interest-rate"
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FaPercent size={11} style={{ color: "var(--colors-primary)" }} />
              Interest Rate Scenario:
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                id="forecast-interest-rate"
                max="30"
                min="0"
                step="0.1"
                style={{
                  width: "68px",
                  padding: "4px 18px 4px 8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "right",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                  color: "var(--colors-primary)",
                  outline: "none",
                  MozAppearance: "textfield",
                  appearance: "textfield",
                }}
                type="number"
                value={interestRate}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsCustomRate(true);
                  setInterestRate(Number.isFinite(val) ? val : 0);
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  fontSize: "11px",
                  color: "var(--colors-text-muted)",
                  pointerEvents: "none",
                }}
              >
                %
              </span>
            </div>
            {isCustomRate && (
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "999px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                  color: "var(--colors-text-muted)",
                  cursor: "pointer",
                }}
                title={`Reset to portfolio weighted APY (${defaultRate.toFixed(2)}%)`}
                type="button"
                onClick={() => {
                  setIsCustomRate(false);
                  setInterestRate(defaultRate);
                }}
              >
                <FaUndo size={9} /> Reset ({defaultRate.toFixed(2)}%)
              </button>
            )}
          </div>

          <FLPCheckbox
            checked={adjustForInflation}
            id="forecast-inflation-toggle"
            label="Real terms (-2.5% inflation)"
            size="sm"
            title="Discount projected growth by 2.5% annual inflation to show real purchasing power"
            onChange={(e) => setAdjustForInflation(e.target.checked)}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="forecast-horizon"
              style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: 500 }}
            >
              Horizon:
            </label>
            <select
              id="forecast-horizon"
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--colors-border)",
                backgroundColor: "var(--colors-surface)",
                color: "var(--colors-text-primary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
            >
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={25}>25 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div style={{ height: "220px", width: "100%" }}>
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={projectionData} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#6363f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6363f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorCash" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="yearLabel" fontSize={11} stroke="var(--colors-text-muted)" />
            <YAxis
              fontSize={11}
              stroke="var(--colors-text-muted)"
              tickFormatter={(v) =>
                v >= 1000 ? `${symbol}${(v / 1000).toFixed(0)}k` : `${symbol}${v}`
              }
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value) || 0), ""]}
              contentStyle={{
                backgroundColor: "var(--colors-surface)",
                borderColor: "var(--colors-border)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
            <Area
              dataKey="Total Forecast"
              fill="url(#colorTotal)"
              name="Projected Total (Interest + Deposits)"
              stroke="#6363f1"
              strokeWidth={2.5}
              type="monotone"
            />
            <Area
              dataKey="Cash Contributions"
              fill="url(#colorCash)"
              name="Contributions Only (0% Interest)"
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Summary Metrics */}
      <div className={statsGridStyle}>
        <div>
          <FLPText color="text.muted" fontSize="xs">
            Starting Balance
          </FLPText>
          <FLPText fontSize="sm" fontWeight="semibold" className="tabular-nums">
            {formatCurrency(startingBalance)}
          </FLPText>
        </div>
        <div>
          <FLPText color="text.muted" fontSize="xs">
            {horizonYears}-Year Contributions
          </FLPText>
          <FLPText fontSize="sm" fontWeight="semibold" className="tabular-nums">
            +{formatCurrency(Math.round(totalContributed - startingBalance))}
          </FLPText>
        </div>
        <div>
          <FLPText color="text.muted" fontSize="xs">
            Compound Interest Earned
          </FLPText>
          <FLPText
            fontSize="sm"
            fontWeight="semibold"
            className="tabular-nums"
            style={{ color: "var(--colors-success-500)" }}
          >
            +{formatCurrency(Math.round(totalInterestEarned))}
          </FLPText>
        </div>
        <div>
          <FLPText color="text.muted" fontSize="xs">
            Forecast Balance (Year {horizonYears})
          </FLPText>
          <FLPText
            fontSize="sm"
            fontWeight="bold"
            className="tabular-nums"
            style={{ color: "var(--colors-primary)" }}
          >
            {formatCurrency(Math.round(finalTotal))}
          </FLPText>
        </div>
      </div>

      {/* Savings Milestones */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaFlagCheckered style={{ color: "var(--colors-primary)" }} size={13} />
            <FLPHeading as="h5" size="xs">
              Milestone Timeline at {effectiveScenarioRate.toFixed(1)}% APY
              {adjustForInflation ? " (Real)" : ""}
            </FLPHeading>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="custom-milestone-goal"
              style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}
            >
              Custom Goal ({symbol}):
            </label>
            <input
              id="custom-milestone-goal"
              min="0"
              placeholder="e.g. 40000"
              step="1000"
              style={{
                width: "95px",
                padding: "3px 8px",
                fontSize: "11px",
                borderRadius: "5px",
                border: "1px solid var(--colors-border)",
                backgroundColor: "var(--colors-surface)",
                color: "var(--colors-text-primary)",
                outline: "none",
                MozAppearance: "textfield",
                appearance: "textfield",
              }}
              type="number"
              value={customGoalInput}
              onChange={(e) => setCustomGoalInput(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "8px",
          }}
        >
          {milestones.map((m) => {
            return (
              <div
                key={`${m.isCustom ? "custom" : "std"}-${m.target}`}
                className={milestoneCardStyle}
                style={
                  m.isCustom
                    ? {
                        borderColor: "var(--colors-primary)",
                        backgroundColor: "rgba(99, 99, 241, 0.04)",
                      }
                    : undefined
                }
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <FLPText fontSize="sm" fontWeight="bold">
                    {formatCurrency(m.target)}
                  </FLPText>
                  {m.achieved ? (
                    <FaCheckCircle style={{ color: "var(--colors-success-500)" }} size={13} />
                  ) : m.isCustom ? (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--colors-primary)",
                        textTransform: "uppercase",
                      }}
                    >
                      Goal
                    </span>
                  ) : null}
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  {m.achieved ? (
                    <span style={{ color: "var(--colors-success-500)", fontWeight: "medium" }}>
                      Reached!
                    </span>
                  ) : m.years === Infinity ? (
                    "Not reached"
                  ) : m.years === 0 ? (
                    `In ~${m.months} month${m.months === 1 ? "" : "s"}`
                  ) : (
                    `In ~${m.years}y ${m.months}m`
                  )}
                </FLPText>
              </div>
            );
          })}
        </div>
      </div>
    </FLPCard>
  );
};

export default SavingsForecasterCard;
