import {
  calculateAvalanche,
  calculateCompoundTrajectory,
  calculateDebtToWealthBridge,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
  type DebtItem,
  persistOnboardingSeed,
} from "@repo/common";
import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useMemo, useState } from "react";
import { FaFire, FaRocket } from "react-icons/fa";
import { FiAlertTriangle, FiCheckCircle, FiShield } from "react-icons/fi";
import { getAppUrl } from "../utils/url";

const cardStyle = css({
  backgroundColor: { base: "slate.50", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  boxShadow: {
    base: "0 20px 45px rgba(15, 23, 42, 0.08)",
    _dark: "0 20px 45px rgba(0, 0, 0, 0.3)",
  },
  p: { base: "6", md: "8" },
  width: "100%",
  maxWidth: "5xl",
  mx: "auto",
  textAlign: "left",
});

const tabSwitcherStyle = css({
  display: "inline-flex",
  padding: "4px",
  backgroundColor: { base: "slate.200", _dark: "dark.bg" },
  borderRadius: "xl",
  gap: "4px",
});

const tabButtonStyle = (active: boolean, activeColor = "#6363F1") =>
  css({
    padding: "8px 16px",
    borderRadius: "lg",
    fontSize: "sm",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    backgroundColor: active ? { base: "#ffffff", _dark: "dark.surface" } : "transparent",
    color: active ? activeColor : { base: "slate.600", _dark: "slate.400" },
    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.15s ease",
  });

const personaChipStyle = (active: boolean) =>
  css({
    fontSize: "xs",
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "indigo.500" : { base: "slate.200", _dark: "slate.700" },
    backgroundColor: active
      ? { base: "rgba(99, 102, 241, 0.1)", _dark: "rgba(99, 102, 241, 0.2)" }
      : { base: "#ffffff", _dark: "dark.bg" },
    color: active
      ? { base: "indigo.700", _dark: "indigo.300" }
      : { base: "slate.600", _dark: "slate.400" },
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: { borderColor: "indigo.500" },
  });

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  mb: "4",
});

const labelStyle = css({
  fontSize: "sm",
  fontWeight: "600",
  color: { base: "slate.800", _dark: "slate.200" },
  display: "flex",
  justifyContent: "space-between",
});

const inputFieldStyle = css({
  width: "100%",
  padding: "10px 14px 10px 32px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: { base: "slate.300", _dark: "slate.700" },
  backgroundColor: { base: "#ffffff", _dark: "dark.bg" },
  color: { base: "slate.900", _dark: "#ffffff" },
  fontSize: "md",
  fontWeight: "600",
});

const resultsCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.bg" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: { base: "0 4px 12px rgba(0,0,0,0.03)", _dark: "0 4px 12px rgba(0,0,0,0.2)" },
});

const subStatBoxStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  padding: "14px",
  backgroundColor: { base: "slate.50", _dark: "dark.surface" },
  borderRadius: "12px",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
});

type PersonaKey = "graduate" | "family_100k" | "landlord" | "wealth_builder";

interface PersonaConfig {
  name: string;
  badge: string;
  mode: "debt" | "wealth";
  debtBalance?: number;
  debtApr?: number;
  debtMonthlyBudget?: number;
  annualIncome?: number;
  savings?: number;
  monthlyContribution?: number;
  mortgageBalance?: number;
  inferredModules: string[];
}

const PERSONAS: Record<PersonaKey, PersonaConfig> = {
  graduate: {
    name: "Graduate Tackling Overdraft & Card",
    badge: "Debt Clear Stage",
    mode: "debt",
    debtBalance: 4200,
    debtApr: 24.9,
    debtMonthlyBudget: 250,
    annualIncome: 28000,
    inferredModules: ["debt", "budget", "accounts"],
  },
  family_100k: {
    name: "Young Family in £100k Tax Trap",
    badge: "60% Marginal Rate",
    mode: "wealth",
    annualIncome: 115000,
    savings: 30000,
    monthlyContribution: 800,
    inferredModules: ["tax", "pension", "forecast"],
  },
  landlord: {
    name: "Property Owner / BTL Landlord",
    badge: "Section 24 Restricted",
    mode: "wealth",
    annualIncome: 75000,
    savings: 45000,
    monthlyContribution: 500,
    mortgageBalance: 240000,
    inferredModules: ["mortgage", "tax", "accounts"],
  },
  wealth_builder: {
    name: "Mid-Career Wealth Builder",
    badge: "ISA & SIPP Velocity",
    mode: "wealth",
    annualIncome: 65000,
    savings: 50000,
    monthlyContribution: 1200,
    inferredModules: ["savings", "pension", "forecast", "accounts"],
  },
};

export const HeroCalculator: FC = () => {
  const appUrl = getAppUrl();
  const [activeTab, setActiveTab] = useState<"debt" | "wealth">("debt");
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>("graduate");

  // Inputs
  const [debtBalance, setDebtBalance] = useState<number>(4200);
  const [debtApr, setDebtApr] = useState<number>(24.9);
  const [debtMonthlyBudget, setDebtMonthlyBudget] = useState<number>(250);

  const [annualIncome, setAnnualIncome] = useState<number>(65000);
  const [savings, setSavings] = useState<number>(25000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(600);
  const [mortgageBalance, setMortgageBalance] = useState<number>(0);

  const handleApplyPersona = (key: PersonaKey) => {
    setSelectedPersona(key);
    const p = PERSONAS[key];
    setActiveTab(p.mode);
    if (p.debtBalance !== undefined) setDebtBalance(p.debtBalance);
    if (p.debtApr !== undefined) setDebtApr(p.debtApr);
    if (p.debtMonthlyBudget !== undefined) setDebtMonthlyBudget(p.debtMonthlyBudget);
    if (p.annualIncome !== undefined) setAnnualIncome(p.annualIncome);
    if (p.savings !== undefined) setSavings(p.savings);
    if (p.monthlyContribution !== undefined) setMonthlyContribution(p.monthlyContribution);
    if (p.mortgageBalance !== undefined) setMortgageBalance(p.mortgageBalance);
  };

  // Calculations
  const debtsForCalc = useMemo<DebtItem[]>(() => {
    return [
      {
        id: "hero-debt-item",
        name: "Cards & Overdraft",
        balance: debtBalance,
        apr: debtApr,
        minimumPayment: Math.max(Math.round(debtBalance * 0.025), 40),
        type: "credit_card",
      },
    ];
  }, [debtBalance, debtApr]);

  const debtPayoff = useMemo(() => {
    const minPay = debtsForCalc[0]?.minimumPayment ?? 40;
    const extra = Math.max(0, debtMonthlyBudget - minPay);
    return calculateAvalanche(debtsForCalc, extra);
  }, [debtsForCalc, debtMonthlyBudget]);

  const bridge = useMemo(() => {
    const minPay = debtsForCalc[0]?.minimumPayment ?? 40;
    const extra = Math.max(0, debtMonthlyBudget - minPay);
    return calculateDebtToWealthBridge(debtsForCalc, extra, 6.0, 3);
  }, [debtsForCalc, debtMonthlyBudget]);

  const threeYearWealth = useMemo(() => {
    const last = bridge[bridge.length - 1];
    return last ? last.wealthAccumulated : 0;
  }, [bridge]);

  const interestSaved = useMemo(() => {
    const minInterest = Math.round(debtBalance * (debtApr / 100) * (debtPayoff.months / 12) * 0.85);
    return Math.max(0, minInterest - debtPayoff.totalInterest);
  }, [debtBalance, debtApr, debtPayoff]);

  const trajectory = useMemo(
    () => calculateCompoundTrajectory(savings, monthlyContribution, 5.5, 10),
    [savings, monthlyContribution],
  );

  const trap = useMemo(() => calculateTaxTrapRelief(annualIncome), [annualIncome]);
  const takeHome = useMemo(() => calculateUKTakeHome(annualIncome), [annualIncome]);

  const handleSaveToFlump = () => {
    persistOnboardingSeed({
      annualIncome:
        activeTab === "wealth" ? annualIncome : (PERSONAS[selectedPersona].annualIncome ?? 30000),
      initialCashSavings: activeTab === "wealth" ? savings : 500,
      monthlyContribution: activeTab === "wealth" ? monthlyContribution : debtMonthlyBudget,
      mortgageBalance,
      inferredModules: PERSONAS[selectedPersona].inferredModules as any,
      timestamp: Date.now(),
    });

    if (typeof window !== "undefined") {
      window.location.href = `${appUrl}/onboarding`;
    }
  };

  return (
    <div className={cardStyle}>
      {/* 4-Persona Switcher Header */}
      <div style={{ marginBottom: "20px" }}>
        <div
          className={flex({
            justify: "space-between",
            align: "center",
            flexWrap: "wrap",
            gap: "2",
            mb: "2",
          })}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Select a Realistic UK Persona or Customize Below:
          </span>
          <span style={{ fontSize: "12px", color: "#6363F1", fontWeight: "600" }}>
            {PERSONAS[selectedPersona].badge}
          </span>
        </div>
        <div className={flex({ gap: "2", flexWrap: "wrap" })}>
          {(Object.keys(PERSONAS) as PersonaKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={personaChipStyle(selectedPersona === key)}
              onClick={() => handleApplyPersona(key)}
            >
              {PERSONAS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Tab Mode Switcher: Debt vs Wealth */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <div className={tabSwitcherStyle}>
          <button
            type="button"
            className={tabButtonStyle(activeTab === "debt", "#ef4444")}
            onClick={() => setActiveTab("debt")}
          >
            <FaFire size={14} /> Clear Debt Fast
          </button>
          <button
            type="button"
            className={tabButtonStyle(activeTab === "wealth", "#10b981")}
            onClick={() => setActiveTab("wealth")}
          >
            <FaRocket size={14} /> Build Wealth & Save Tax
          </button>
        </div>
      </div>

      <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8", alignItems: "stretch" })}>
        {/* Left Column: Sliders & Inputs */}
        <div className={stack({ gap: "4" })}>
          {activeTab === "debt" ? (
            <>
              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Total High-Interest Debt Balance</span>
                  <span style={{ color: "#ef4444" }}>£{debtBalance.toLocaleString()}</span>
                </span>
                <div style={{ position: "relative" }}>
                  <span
                    style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }}
                  >
                    £
                  </span>
                  <input
                    type="range"
                    min="500"
                    max="30000"
                    step="250"
                    value={debtBalance}
                    onChange={(e) => setDebtBalance(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#ef4444" }}
                  />
                </div>
              </label>

              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Average Interest Rate (APR)</span>
                  <span>{debtApr}%</span>
                </span>
                <input
                  type="range"
                  min="5"
                  max="49.9"
                  step="0.5"
                  value={debtApr}
                  onChange={(e) => setDebtApr(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#ef4444" }}
                />
              </label>

              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Monthly Debt Payoff Budget</span>
                  <span style={{ color: "#10b981", fontWeight: "700" }}>
                    £{debtMonthlyBudget}/mo
                  </span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={debtMonthlyBudget}
                  onChange={(e) => setDebtMonthlyBudget(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#10b981" }}
                />
              </label>
            </>
          ) : (
            <>
              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Annual Gross Income (UK EWNI)</span>
                  <span style={{ color: "#6363f1", fontWeight: "700" }}>
                    £{annualIncome.toLocaleString()}
                  </span>
                </span>
                <input
                  type="range"
                  min="20000"
                  max="180000"
                  step="2500"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#6363f1" }}
                />
              </label>

              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Current Liquid Savings & Investments</span>
                  <span>£{savings.toLocaleString()}</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="150000"
                  step="2500"
                  value={savings}
                  onChange={(e) => setSavings(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#6363f1" }}
                />
              </label>

              <label className={inputGroupStyle}>
                <span className={labelStyle}>
                  <span>Monthly Savings / Investment Velocity</span>
                  <span style={{ color: "#10b981", fontWeight: "700" }}>
                    £{monthlyContribution}/mo
                  </span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#10b981" }}
                />
              </label>
            </>
          )}

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              fontSize: "12px",
              color: "#4338ca",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiShield size={16} />
            Calculations run 100% in your browser. No personal data is stored until you save your
            plan.
          </div>
        </div>

        {/* Right Column: Dynamic Answers & Handoff */}
        <div className={resultsCardStyle}>
          {activeTab === "debt" ? (
            <div className={stack({ gap: "4" })}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Projected Debt Payoff Speed
              </span>

              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "800",
                    color: "var(--colors-text-primary, #0f172a)",
                  }}
                >
                  {debtPayoff.months}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#64748b" }}>
                  months to complete freedom
                </span>
              </div>

              <div className={subStatBoxStyle}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                    INTEREST SAVED
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "#10b981" }}>
                    £{interestSaved.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                    3-YR WEALTH BRIDGE
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "#6363f1" }}>
                    £{Math.round(threeYearWealth).toLocaleString()}
                  </div>
                </div>
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--colors-text-muted, #475569)",
                  lineHeight: "1.5",
                }}
              >
                Once your cards and overdraft are extinguished in month {debtPayoff.months},
                redirecting that £{debtMonthlyBudget}/mo into an index fund builds £
                {Math.round(threeYearWealth).toLocaleString()} in compounding net worth.
              </p>
            </div>
          ) : (
            <div className={stack({ gap: "4" })}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                10-Year Compounding Projection & Tax Status
              </span>

              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: "800",
                    color: "var(--colors-text-primary, #0f172a)",
                  }}
                >
                  £{Math.round(trajectory.endBalance).toLocaleString()}
                </span>
                <span style={{ fontSize: "1rem", fontWeight: "600", color: "#10b981" }}>
                  (+£{Math.round(trajectory.totalInterest).toLocaleString()} gains)
                </span>
              </div>

              {trap.isInTaxTrap ? (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  <div
                    style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <FiAlertTriangle /> 60% Marginal Tax Trap Detected
                  </div>
                  <div>
                    Sacrificing £{trap.recommendedSacrifice.toLocaleString()} into your pension
                    reclaims £{trap.lostPersonalAllowance.toLocaleString()} allowance and saves £
                    {trap.estimatedTaxSaved.toLocaleString()} in tax.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  <div
                    style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <FiCheckCircle /> Clean Marginal Tax Bracket
                  </div>
                  <div>
                    Monthly take-home: £{Math.round(takeHome.monthlyTakeHome).toLocaleString()} /
                    month after income tax & National Insurance.
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <Button
              size="lg"
              variant="primary"
              onClick={handleSaveToFlump}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Save this plan to your Flump workspace →
            </Button>
            <div
              style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}
            >
              Seeds your baseline into your private Flump account with zero manual re-entry.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
