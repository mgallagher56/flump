import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FiClock } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface RemortgageShockSimProps {
  currentBalance: number;
  currentRate: number;
  propertyValue?: number;
}

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px 18px", md: "24px 28px" },
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
});

const gridLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "14px",
});

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const RemortgageShockSim: FC<RemortgageShockSimProps> = ({
  currentBalance,
  currentRate = 3.5,
  propertyValue: rawPropertyValue,
}) => {
  const propertyValue = rawPropertyValue || Math.round(currentBalance * 1.35);
  const currentLtv = propertyValue > 0 ? (currentBalance / propertyValue) * 100 : 75;

  const [fixEndYear, setFixEndYear] = useState<number>(new Date().getFullYear() + 2);
  const [fixEndMonth, setFixEndMonth] = useState<number>(10); // October
  const [projectedNewRate, setProjectedNewRate] = useState<number>(5.2);

  const rateSliderId = useId();

  // Months remaining on fix
  const monthsRemaining = useMemo(() => {
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    const diff = (fixEndYear - currentY) * 12 + (fixEndMonth - currentM);
    return Math.max(1, diff);
  }, [fixEndYear, fixEndMonth]);

  // Standard 25-yr repayment formulas
  const calculateMonthly = (bal: number, ratePct: number) => {
    const r = ratePct / 100 / 12;
    const n = 25 * 12;
    if (r === 0) return bal / n;
    return (bal * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
  };

  const currentMonthly = calculateMonthly(currentBalance, currentRate);
  const newMonthly = calculateMonthly(currentBalance, projectedNewRate);
  const monthlyShock = Math.max(0, newMonthly - currentMonthly);

  // Target LTV milestone (e.g. 75% or 60%)
  const nextTargetLtv = currentLtv > 75 ? 75 : currentLtv > 60 ? 60 : 50;
  const targetBalance = (propertyValue * nextTargetLtv) / 100;
  const requiredOverpaymentToReachTier = Math.max(0, currentBalance - targetBalance);
  const monthlyOverpaymentNeeded = Math.round(requiredOverpaymentToReachTier / monthsRemaining);

  return (
    <div className={cardStyle} data-testid="remortgage-shock-sim">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              <FiClock />
            </span>
            <FLPHeading as="h3" size="sm">
              Mortgage Deal Expiry & Remortgage Shock Simulator
            </FLPHeading>
          </div>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            Model payment changes when your fixed deal ends and see how overpaying unlocks lower LTV
            brackets.
          </FLPText>
        </div>

        {/* Shock Metric */}
        {monthlyShock > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--colors-text-muted)" }}>
              Projected Payment Shock
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ef4444" }}>
              +{formatGBP(monthlyShock)}{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "var(--colors-text-muted)" }}
              >
                / mo
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Inputs: Deal End Date & Projected Rate */}
      <div className={gridLayout}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="deal-end-month" style={{ fontSize: "12px", fontWeight: 600 }}>
            Fixed Rate Ends On
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              id="deal-end-month"
              value={fixEndMonth}
              onChange={(e) => setFixEndMonth(Number(e.target.value))}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--colors-border)",
                backgroundColor: "var(--colors-background)",
                color: "inherit",
              }}
            >
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={fixEndYear}
              onChange={(e) => setFixEndYear(Number(e.target.value))}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--colors-border)",
                backgroundColor: "var(--colors-background)",
                color: "inherit",
              }}
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--colors-primary)",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            ⏳ {monthsRemaining} months remaining on current {currentRate}% fix
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor={rateSliderId} style={{ fontSize: "12px", fontWeight: 600 }}>
              Projected Renewal / SVR Rate (%)
            </label>
            <span style={{ fontWeight: 700, color: "var(--colors-primary)" }}>
              {projectedNewRate.toFixed(1)}%
            </span>
          </div>
          <input
            id={rateSliderId}
            type="range"
            min={2.0}
            max={8.5}
            step={0.1}
            value={projectedNewRate}
            onChange={(e) => setProjectedNewRate(Number(e.target.value))}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "var(--colors-text-muted)",
            }}
          >
            <span>3.5% (Competitive Fix)</span>
            <span>5.2% (Typical Market)</span>
            <span>7.5% (Lender SVR)</span>
          </div>
        </div>
      </div>

      {/* Target LTV Milestone Badge Box */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: "12px",
          backgroundColor: "rgba(99, 102, 241, 0.05)",
          border: "1px dashed rgba(99, 102, 241, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <strong style={{ fontSize: "13px" }}>Target LTV Tier: {nextTargetLtv}%</strong>
            <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              (Current LTV: {currentLtv.toFixed(1)}%)
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--colors-text-muted)", marginTop: "2px" }}>
            {requiredOverpaymentToReachTier > 0 ? (
              <>
                Overpay <strong>{formatGBP(monthlyOverpaymentNeeded)}/mo</strong> before renewal to
                drop to {nextTargetLtv}% LTV and secure prime interest rates.
              </>
            ) : (
              <>✓ Already within the {nextTargetLtv}% LTV bracket!</>
            )}
          </div>
        </div>

        {requiredOverpaymentToReachTier > 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              Total Overpay to Tier:
            </span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--colors-primary)" }}>
              {formatGBP(requiredOverpaymentToReachTier)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemortgageShockSim;
