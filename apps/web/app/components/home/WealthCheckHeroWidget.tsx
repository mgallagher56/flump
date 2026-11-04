import {
  calculateCompoundTrajectory,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
  ONBOARDING_SEED_STORAGE_KEY,
  type OnboardingSeedPayload,
} from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCompass, FiShield } from "react-icons/fi";
import { useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.07)",
  padding: { base: "20px", md: "32px" },
  width: "100%",
  maxWidth: "4xl",
  margin: "32px auto 0",
  textAlign: "left",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
  alignItems: "stretch",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "20px",
});

const labelStyle = css({
  fontSize: "sm",
  fontWeight: "semibold",
  color: "text.primary",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const inputWrapperStyle = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

const prefixStyle = css({
  position: "absolute",
  left: "14px",
  color: "text.muted",
  fontWeight: "semibold",
  fontSize: "sm",
  pointerEvents: "none",
});

const inputFieldStyle = css({
  width: "100%",
  padding: "10px 14px 10px 32px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "md",
  fontWeight: "medium",
  outline: "none",
  transition: "border-color 0.15s ease",
  "&:focus": {
    borderColor: "primary",
    boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.2)",
  },
});

const chipRowStyle = css({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "6px",
});

const chipStyle = (active: boolean) =>
  css({
    fontSize: "xs",
    fontWeight: "medium",
    padding: "4px 10px",
    borderRadius: "md",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "rgba(99, 102, 241, 0.1)" : "surface",
    color: active ? "primary" : "text.muted",
    cursor: "pointer",
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "primary",
      color: "text.primary",
    },
  });

const resultPaneStyle = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "16px",
  padding: { base: "20px", md: "24px" },
  borderRadius: "xl",
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
});

const metricCardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingBottom: "14px",
  borderBottom: "1px solid",
  borderColor: "border",
});

const formatCurrency = (val: number) => `£${Math.round(val).toLocaleString("en-GB")}`;

export const WealthCheckHeroWidget: FC = () => {
  const navigate = useNavigate();

  const [salary, setSalary] = useState(65000);
  const [savings, setSavings] = useState(25000);
  const [monthlyContribution, setMonthlyContribution] = useState(600);

  const salaryId = useId();
  const savingsId = useId();
  const monthlyId = useId();

  // Calculations from pure TypeScript calculation engine
  const trajectory = useMemo(
    () => calculateCompoundTrajectory(savings, monthlyContribution, 5, 10),
    [savings, monthlyContribution],
  );

  const trapAnalysis = useMemo(() => calculateTaxTrapRelief(salary), [salary]);

  const takeHome = useMemo(() => calculateUKTakeHome(salary, 5, true), [salary]);

  const handleSaveAndStart = () => {
    const payload: OnboardingSeedPayload = {
      grossSalary: salary,
      pensionContributionPct: 5,
      salarySacrifice: true,
      initialCashSavings: Math.round(savings * 0.4),
      initialInvestments: Math.round(savings * 0.6),
      monthlyContribution,
      inferredModules: [
        "accounts",
        "budget",
        "pension",
        "savings",
        "forecast",
        ...(salary >= 95000 ? (["tax"] as const) : []),
      ],
      timestamp: Date.now(),
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ONBOARDING_SEED_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to persist onboarding seed:", err);
      }
    }
    navigate("/signUp");
  };

  return (
    <div className={cardStyle} data-testid="wealth-check-widget">
      <div style={{ marginBottom: "20px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--colors-primary)",
            marginBottom: "6px",
          }}
        >
          <FiCompass /> The 30-Second UK Wealth Check
        </span>
        <FLPHeading as="h3" color="text.primary" size="md">
          Model your 10-year net worth & UK tax efficiency
        </FLPHeading>
      </div>

      <div className={gridStyle}>
        {/* Left Column: 3 Key Inputs */}
        <div>
          <div className={inputGroupStyle}>
            <label className={labelStyle} htmlFor={salaryId}>
              <span>Annual Gross Salary</span>
              <span style={{ color: "var(--colors-primary)", fontWeight: "bold" }}>
                {formatCurrency(salary)}
              </span>
            </label>
            <div className={inputWrapperStyle}>
              <span className={prefixStyle}>£</span>
              <input
                className={inputFieldStyle}
                id={salaryId}
                max={300000}
                min={15000}
                step={1000}
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value) || 0)}
              />
            </div>
            <div className={chipRowStyle}>
              {[38000, 65000, 105000, 120000].map((preset) => (
                <button
                  key={preset}
                  className={chipStyle(salary === preset)}
                  type="button"
                  onClick={() => setSalary(preset)}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className={inputGroupStyle}>
            <label className={labelStyle} htmlFor={savingsId}>
              <span>Current Cash & Investments</span>
              <span style={{ color: "var(--colors-primary)", fontWeight: "bold" }}>
                {formatCurrency(savings)}
              </span>
            </label>
            <div className={inputWrapperStyle}>
              <span className={prefixStyle}>£</span>
              <input
                className={inputFieldStyle}
                id={savingsId}
                max={500000}
                min={0}
                step={1000}
                type="number"
                value={savings}
                onChange={(e) => setSavings(Number(e.target.value) || 0)}
              />
            </div>
            <div className={chipRowStyle}>
              {[10000, 25000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  className={chipStyle(savings === preset)}
                  type="button"
                  onClick={() => setSavings(preset)}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className={inputGroupStyle} style={{ marginBottom: 0 }}>
            <label className={labelStyle} htmlFor={monthlyId}>
              <span>Monthly Savings & Investments</span>
              <span style={{ color: "var(--colors-primary)", fontWeight: "bold" }}>
                {formatCurrency(monthlyContribution)}/mo
              </span>
            </label>
            <div className={inputWrapperStyle}>
              <span className={prefixStyle}>£</span>
              <input
                className={inputFieldStyle}
                id={monthlyId}
                max={5000}
                min={50}
                step={50}
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
              />
            </div>
            <div className={chipRowStyle}>
              {[300, 600, 1000, 1500].map((preset) => (
                <button
                  key={preset}
                  className={chipStyle(monthlyContribution === preset)}
                  type="button"
                  onClick={() => setMonthlyContribution(preset)}
                >
                  {formatCurrency(preset)}/mo
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 3 Live Outputs + Conversion Hook */}
        <div className={resultPaneStyle}>
          {/* Output 1: 10-Yr Projected Net Worth */}
          <div className={metricCardStyle}>
            <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
              Projected Net Worth in 10 Years (5% real return)
            </span>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#10b981" }}>
              {formatCurrency(trajectory.endBalance)}
            </div>
            <div style={{ fontSize: "11px", color: "text.muted" }}>
              {formatCurrency(trajectory.totalContributions)} contributed +{" "}
              {formatCurrency(trajectory.totalInterest)} compound growth
            </div>
          </div>

          {/* Output 2: Marginal Tax Rate & 60% Trap Alert */}
          <div className={metricCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Marginal Tax Rate
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  backgroundColor: trapAnalysis.isInTaxTrap
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(99, 102, 241, 0.12)",
                  color: trapAnalysis.isInTaxTrap ? "#ef4444" : "var(--colors-primary)",
                }}
              >
                {trapAnalysis.marginalRatePct}% Marginal
              </span>
            </div>

            {trapAnalysis.isInTaxTrap ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#ef4444",
                  fontWeight: "600",
                }}
              >
                <FiAlertTriangle /> £100k–£125k 60% Personal Allowance Trap Active
              </div>
            ) : trapAnalysis.isNearTaxTrap ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#f59e0b",
                  fontWeight: "600",
                }}
              >
                <FiAlertTriangle /> Approaching 60% Tax Trap at £100k
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "text.muted", marginTop: "2px" }}>
                Estimated take-home: {formatCurrency(takeHome.monthlyTakeHome)}/month
              </div>
            )}
          </div>

          {/* Output 3: Potential Annual Salary Sacrifice Tax Saved */}
          <div className={metricCardStyle} style={{ borderBottom: "none", paddingBottom: 0 }}>
            <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
              Potential Annual Pension / SIPP Tax Savings
            </span>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "text.primary" }}>
              {trapAnalysis.isInTaxTrap
                ? `${formatCurrency(trapAnalysis.estimatedTaxSaved)} / yr reclaimed`
                : `${formatCurrency(Math.round(salary * 0.05 * (trapAnalysis.marginalRatePct / 100)))} / yr saved`}
            </div>
            <div style={{ fontSize: "11px", color: "text.muted" }}>
              {trapAnalysis.isInTaxTrap
                ? `By sacrificing £${Math.round(trapAnalysis.excessAbove100k).toLocaleString()} into pension`
                : "Via 5% workplace salary sacrifice with full tax & NI relief"}
            </div>
          </div>

          {/* Conversion Hook Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <FLPButton
              size="lg"
              onClick={handleSaveAndStart}
              style={{
                width: "100%",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                fontWeight: "700",
              }}
            >
              Save this baseline & unlock your forecast <FiArrowRight aria-hidden="true" />
            </FLPButton>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "11px",
                color: "text.muted",
                textAlign: "center",
              }}
            >
              <FiShield /> Pre-populates 90-second onboarding. Zero commitment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WealthCheckHeroWidget;
