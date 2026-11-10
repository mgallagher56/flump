import {
  calculateAvalanche,
  calculateCompoundTrajectory,
  calculateDebtToWealthBridge,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
  type DebtItem,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FaFire, FaRocket } from "react-icons/fa";
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

const tabSwitcherStyle = css({
  display: "inline-flex",
  padding: "4px",
  backgroundColor: "muted",
  borderRadius: "xl",
  gap: "4px",
  marginBottom: "24px",
});

const tabButtonStyle = (active: boolean, activeColor = "primary") =>
  css({
    padding: "8px 18px",
    borderRadius: "lg",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    backgroundColor: active ? "card" : "transparent",
    color: active ? activeColor : "text.muted",
    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.15s ease",
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
  });

const outputColumnStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "20px",
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

  // Mode: "debt" | "wealth"
  const [activeTab, setActiveTab] = useState<"debt" | "wealth">("debt");

  // Tab A: Debt Payoff Inputs
  const [debtBalance, setDebtBalance] = useState<number>(6500);
  const [debtApr, setDebtApr] = useState<number>(22);
  const [debtMonthlyBudget, setDebtMonthlyBudget] = useState<number>(300);

  // Tab B: Wealth Check Inputs
  const [annualIncome, setAnnualIncome] = useState<number>(65000);
  const [savings, setSavings] = useState<number>(25000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(600);

  const incomeId = useId();
  const savingsId = useId();
  const monthlyId = useId();

  // Debt Calculations
  const debtsForCalc = useMemo<DebtItem[]>(() => {
    return [
      {
        id: "hero-debt-1",
        name: "Credit Cards & Loans",
        balance: debtBalance,
        apr: debtApr,
        minimumPayment: Math.max(Math.round(debtBalance * 0.025), 50),
        type: "credit_card",
      },
    ];
  }, [debtBalance, debtApr]);

  const debtPayoffResult = useMemo(() => {
    const extra = Math.max(0, debtMonthlyBudget - debtsForCalc[0].minimumPayment);
    return calculateAvalanche(debtsForCalc, extra);
  }, [debtsForCalc, debtMonthlyBudget]);

  const bridgePoints = useMemo(() => {
    const extra = Math.max(0, debtMonthlyBudget - debtsForCalc[0].minimumPayment);
    return calculateDebtToWealthBridge(debtsForCalc, extra, 6.0, 3);
  }, [debtsForCalc, debtMonthlyBudget]);

  const projected3YearWealth = useMemo(() => {
    const lastPoint = bridgePoints[bridgePoints.length - 1];
    return lastPoint ? lastPoint.wealthAccumulated : 0;
  }, [bridgePoints]);

  const interestSaved = useMemo(() => {
    const minInterest = Math.round(
      debtBalance * (debtApr / 100) * (debtPayoffResult.months / 12) * 0.85,
    );
    return Math.max(0, minInterest - debtPayoffResult.totalInterest);
  }, [debtBalance, debtApr, debtPayoffResult]);

  // Wealth Calculations
  const trajectory = useMemo(
    () => calculateCompoundTrajectory(savings, monthlyContribution, 5, 10),
    [savings, monthlyContribution],
  );

  const trapAnalysis = useMemo(() => calculateTaxTrapRelief(annualIncome), [annualIncome]);
  const takeHome = useMemo(() => calculateUKTakeHome(annualIncome, 5, true), [annualIncome]);

  const handleSaveAndStart = () => {
    const isDebt = activeTab === "debt";

    const payload: OnboardingSeedPayload = {
      annualIncome: isDebt ? 34000 : annualIncome,
      pensionContributionPct: 5,
      salarySacrifice: true,
      initialCashSavings: isDebt ? 800 : Math.round(savings * 0.4),
      initialInvestments: isDebt ? 0 : Math.round(savings * 0.6),
      monthlyContribution: isDebt ? 0 : monthlyContribution,
      inferredModules: isDebt
        ? ["accounts", "budget", "debt"]
        : [
            "accounts",
            "budget",
            "pension",
            "forecast",
            ...(annualIncome >= 95000 ? (["tax"] as const) : []),
          ],
      timestamp: Date.now(),
    };
    persistOnboardingSeed(payload);

    persistOnboardingSeed(payload);
    navigate("/signUp");
  };

  return (
    <div className={cardStyle} data-testid="wealth-check-widget">
      {/* 2-Tab Interactive Switcher */}
      <div className={tabSwitcherStyle}>
        <button
          className={tabButtonStyle(activeTab === "debt", "var(--colors-destructive-500)")}
          type="button"
          onClick={() => setActiveTab("debt")}
        >
          <FaFire color="var(--colors-destructive-500)" /> Clear debt and stabilise
        </button>
        <button
          className={tabButtonStyle(activeTab === "wealth", "var(--colors-primary)")}
          type="button"
          onClick={() => setActiveTab("wealth")}
        >
          <FaRocket color="var(--colors-primary)" /> Build wealth and optimise tax
        </button>
      </div>

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
            color: activeTab === "debt" ? "var(--colors-destructive-500)" : "var(--colors-primary)",
            marginBottom: "6px",
          }}
        >
          <FiCompass />
          {activeTab === "debt"
            ? "The 30-second debt payoff and recovery check"
            : "The 30-second UK wealth and tax check"}
        </span>
        <FLPHeading as="h3" color="text.primary" size="md">
          {activeTab === "debt"
            ? "Calculate your debt-free exit date and post-payoff wealth bridge"
            : "Model your 10-year net worth and UK tax efficiency"}
        </FLPHeading>
      </div>

      {activeTab === "debt" ? (
        /* TAB A: CLEAR DEBT & STABILIZE */
        <div className={gridStyle}>
          <div>
            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor="hero-debt-balance-input">
                <span>Total card and loan liabilities</span>
                <span style={{ color: "var(--colors-destructive-500)", fontWeight: "bold" }}>
                  {formatCurrency(debtBalance)}
                </span>
              </label>
              <div className={inputWrapperStyle}>
                <span className={prefixStyle}>£</span>
                <input
                  aria-label="Total card and loan liabilities"
                  className={inputFieldStyle}
                  id="hero-debt-balance-input"
                  max={80000}
                  min={500}
                  step={500}
                  type="number"
                  value={debtBalance}
                  onChange={(e) => setDebtBalance(Number(e.target.value) || 0)}
                />
              </div>
              <div className={chipRowStyle}>
                {[2500, 6500, 12000, 20000].map((preset) => (
                  <button
                    key={preset}
                    className={chipStyle(debtBalance === preset)}
                    type="button"
                    onClick={() => setDebtBalance(preset)}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor="hero-debt-apr-input">
                <span>Average interest rate (APR)</span>
                <span style={{ color: "var(--colors-destructive-500)", fontWeight: "bold" }}>
                  {debtApr}%
                </span>
              </label>
              <div className={inputWrapperStyle}>
                <span className={prefixStyle}>%</span>
                <input
                  aria-label="Average APR rate"
                  className={inputFieldStyle}
                  id="hero-debt-apr-input"
                  max={50}
                  min={0}
                  step={0.5}
                  type="number"
                  value={debtApr}
                  onChange={(e) => setDebtApr(Number(e.target.value) || 0)}
                />
              </div>
              <div className={chipRowStyle}>
                {[0, 18.9, 22.9, 39.9].map((preset) => (
                  <button
                    key={preset}
                    className={chipStyle(debtApr === preset)}
                    type="button"
                    onClick={() => setDebtApr(preset)}
                  >
                    {preset === 0
                      ? "0% BT Card"
                      : preset === 39.9
                        ? "39.9% Overdraft"
                        : `${preset}% APR`}
                  </button>
                ))}
              </div>
            </div>

            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor="hero-debt-budget-input">
                <span>Monthly budget for debt</span>
                <span style={{ color: "primary", fontWeight: "bold" }}>
                  {formatCurrency(debtMonthlyBudget)}/mo
                </span>
              </label>
              <div className={inputWrapperStyle}>
                <span className={prefixStyle}>£</span>
                <input
                  aria-label="Monthly budget for debt"
                  className={inputFieldStyle}
                  id="hero-debt-budget-input"
                  max={2000}
                  min={100}
                  step={25}
                  type="number"
                  value={debtMonthlyBudget}
                  onChange={(e) => setDebtMonthlyBudget(Number(e.target.value) || 0)}
                />
              </div>
              <div className={chipRowStyle}>
                {[200, 300, 450, 750].map((preset) => (
                  <button
                    key={preset}
                    className={chipStyle(debtMonthlyBudget === preset)}
                    type="button"
                    onClick={() => setDebtMonthlyBudget(preset)}
                  >
                    {formatCurrency(preset)}/mo
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={outputColumnStyle}>
            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Target debt-free date
              </span>
              <div
                style={{ fontSize: "26px", fontWeight: "800", color: "var(--colors-success-500)" }}
              >
                {debtPayoffResult.debtFreeDate}
              </div>
              <div style={{ fontSize: "12px", color: "text.muted" }}>
                {debtPayoffResult.months} months to complete debt freedom
              </div>
            </div>

            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Interest saved via avalanche strategy
              </span>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--colors-destructive-500)",
                }}
              >
                +{formatCurrency(interestSaved || 720)}
              </div>
              <div style={{ fontSize: "12px", color: "text.muted" }}>
                Compared to paying standard minimum amounts
              </div>
            </div>

            <div className={metricCardStyle} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Projected wealth 3 years after debt payoff
              </span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--colors-primary)" }}>
                +{formatCurrency(projected3YearWealth || 11500)}
              </div>
              <div style={{ fontSize: "12px", color: "text.muted" }}>
                Redirecting your £{debtMonthlyBudget}/mo debt budget into a tax-free ISA
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              <FLPButton
                size="lg"
                variant="destructive"
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
                Start your debt payoff plan <FiArrowRight aria-hidden="true" />
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
                <FiShield /> Pre-configures debt payoff mode. Free forever.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB B: BUILD WEALTH & OPTIMIZE TAX */
        <div className={gridStyle}>
          <div>
            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor={incomeId}>
                <span>Annual gross salary</span>
                <span style={{ color: "var(--colors-primary)", fontWeight: "bold" }}>
                  {formatCurrency(annualIncome)}
                </span>
              </label>
              <div className={inputWrapperStyle}>
                <span className={prefixStyle}>£</span>
                <input
                  className={inputFieldStyle}
                  id={incomeId}
                  max={300000}
                  min={15000}
                  step={1000}
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value) || 0)}
                />
              </div>
              <div className={chipRowStyle}>
                {[38000, 65000, 105000, 120000].map((preset) => (
                  <button
                    key={preset}
                    className={chipStyle(annualIncome === preset)}
                    type="button"
                    onClick={() => setAnnualIncome(preset)}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor={savingsId}>
                <span>Current cash and investments</span>
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
                {[5000, 25000, 75000, 150000].map((preset) => (
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

            <div className={inputGroupStyle}>
              <label className={labelStyle} htmlFor={monthlyId}>
                <span>Monthly savings and investments</span>
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
                  min={0}
                  step={50}
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                />
              </div>
              <div className={chipRowStyle}>
                {[200, 600, 1200, 2000].map((preset) => (
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

          <div className={outputColumnStyle}>
            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                10-year projected wealth (at 5% real return)
              </span>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--colors-primary)" }}>
                {formatCurrency(trajectory.endBalance)}
              </div>
              <div style={{ fontSize: "12px", color: "text.muted" }}>
                Including {formatCurrency(trajectory.totalInterest)} in compound interest
              </div>
            </div>

            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Marginal tax rate and relief
              </span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "text.primary" }}>
                {trapAnalysis.marginalRatePct}% marginal rate
              </div>
              {trapAnalysis.isInTaxTrap ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "var(--colors-destructive-500)",
                    fontWeight: "600",
                  }}
                >
                  <FiAlertTriangle /> £100k–£125k 60% Personal Allowance trap active
                </div>
              ) : trapAnalysis.isNearTaxTrap ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "var(--colors-warning-500)",
                    fontWeight: "600",
                  }}
                >
                  <FiAlertTriangle /> Approaching 60% tax trap at £100k
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "text.muted", marginTop: "2px" }}>
                  Estimated take-home: {formatCurrency(takeHome.monthlyTakeHome)}/month
                </div>
              )}
            </div>

            <div className={metricCardStyle} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <span style={{ fontSize: "12px", color: "text.muted", fontWeight: "600" }}>
                Potential annual pension or SIPP tax savings
              </span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "text.primary" }}>
                {trapAnalysis.isInTaxTrap
                  ? `${formatCurrency(trapAnalysis.estimatedTaxSaved)} / yr reclaimed`
                  : `${formatCurrency(Math.round(annualIncome * 0.05 * (trapAnalysis.marginalRatePct / 100)))} / yr saved`}
              </div>
              <div style={{ fontSize: "11px", color: "text.muted" }}>
                {trapAnalysis.isInTaxTrap
                  ? `By sacrificing £${Math.round(trapAnalysis.excessAbove100k).toLocaleString()} into pension`
                  : "Via 5% workplace salary sacrifice with full tax & NI relief"}
              </div>
            </div>

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
                Save this baseline and unlock your forecast <FiArrowRight aria-hidden="true" />
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
                <FiShield /> Pre-populates 60-second onboarding. Zero commitment.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WealthCheckHeroWidget;
