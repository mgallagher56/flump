import {
  calculateAvalanche,
  calculateMortgageVsIsa,
  calculateOverdraftCost,
  calculateSection24LandlordTax,
  calculateSnowball,
  calculateTaxTrapRelief,
  calculateZeroPercentCliff,
  type DebtItem,
  evaluateUkStudentLoan,
  persistOnboardingSeed,
} from "@repo/common";
import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { getAppUrl } from "../utils/url";
import { TOOLS_CATALOG } from "./ToolsIndexPage";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "12",
  px: "4",
});

const cardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  boxShadow: { base: "0 10px 30px rgba(0,0,0,0.04)", _dark: "0 10px 30px rgba(0,0,0,0.2)" },
  mb: "12",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  mb: "5",
});

const labelStyle = css({
  fontSize: "14px",
  fontWeight: "600",
  color: { base: "slate.800", _dark: "slate.200" },
  display: "flex",
  justifyContent: "space-between",
});

const resultBoxStyle = css({
  backgroundColor: { base: "#f8fafc", _dark: "dark.bg" },
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
});

const teaserHandoffStyle = css({
  marginTop: "32px",
  padding: "24px",
  borderRadius: "16px",
  backgroundColor: { base: "#eef2ff", _dark: "rgba(99, 102, 241, 0.12)" },
  border: "1px solid",
  borderColor: { base: "#c7d2fe", _dark: "rgba(99, 102, 241, 0.3)" },
});

export const ToolPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const appUrl = getAppUrl();
  const normalizedSlug =
    slug === "mortgage-overpay-vs-isa-calculator" ? "mortgage-overpayment-vs-isa-calculator" : slug;
  const toolMeta =
    TOOLS_CATALOG.find((t) => t.slug === normalizedSlug) ??
    (TOOLS_CATALOG[0] as (typeof TOOLS_CATALOG)[number]);

  // Tool 1: £100k Tax Trap State
  const [trapSalary, setTrapSalary] = useState(115000);
  const [trapSacrifice, setTrapSacrifice] = useState(15000);

  // Tool 2: Snowball vs Avalanche State
  const [debts, setDebts] = useState<DebtItem[]>([
    {
      id: "d1",
      name: "Credit Card A",
      balance: 3500,
      apr: 24.9,
      minimumPayment: 100,
      type: "credit_card",
    },
    {
      id: "d2",
      name: "Store Card",
      balance: 1200,
      apr: 29.9,
      minimumPayment: 40,
      type: "credit_card",
    },
    { id: "d3", name: "Personal Loan", balance: 5000, apr: 7.9, minimumPayment: 150, type: "loan" },
  ]);
  const [extraPayment, setExtraPayment] = useState(200);

  // Tool 3: 0% Balance Transfer State
  const [transferBalance, setTransferBalance] = useState(5000);
  const [transferFeePct, setTransferFeePct] = useState(3.0);
  const [promoMonths, setPromoMonths] = useState(18);
  const [postPromoApr, setPostPromoApr] = useState(26.9);
  const [monthlyAffordability, setMonthlyAffordability] = useState(250);

  // Tool 4: Section 24 Landlord State
  const [rentalIncome, setRentalIncome] = useState(24000);
  const [btlMortgageInterest, setBtlMortgageInterest] = useState(12000);
  const [otherAllowableExpenses, setOtherAllowableExpenses] = useState(3000);
  const [employmentIncome, setEmploymentIncome] = useState(60000);

  // Tool 5: Mortgage Overpayment vs ISA State
  const [mortgageBalance, setMortgageBalance] = useState(250000);
  const [mortgageRate, setMortgageRate] = useState(5.2);
  const [remainingYears, setRemainingYears] = useState(20);
  const [monthlyOverpay, setMonthlyOverpay] = useState(350);
  const [expectedIsaReturn, setExpectedIsaReturn] = useState(7.0);

  // Tool 6: Overdraft Cost State
  const [overdraftAmount, setOverdraftAmount] = useState(1500);
  const [overdraftEar, setOverdraftEar] = useState(39.9);
  const [monthlyOverdraftPayment, setMonthlyOverdraftPayment] = useState(100);

  // Tool 7: Student Loan State
  const [graduateSalary, setGraduateSalary] = useState(45000);
  const [studentLoanBalance, setStudentLoanBalance] = useState(42000);

  // Calculations
  const trapResult = useMemo(() => calculateTaxTrapRelief(trapSalary), [trapSalary]);
  const avalancheResult = useMemo(
    () => calculateAvalanche(debts, extraPayment),
    [debts, extraPayment],
  );
  const snowballResult = useMemo(
    () => calculateSnowball(debts, extraPayment),
    [debts, extraPayment],
  );
  const transferResult = useMemo(
    () =>
      calculateZeroPercentCliff(transferBalance, promoMonths, postPromoApr, monthlyAffordability),
    [transferBalance, promoMonths, postPromoApr, monthlyAffordability],
  );
  const section24Result = useMemo(
    () =>
      calculateSection24LandlordTax(
        employmentIncome,
        rentalIncome,
        btlMortgageInterest,
        otherAllowableExpenses,
      ),
    [employmentIncome, rentalIncome, btlMortgageInterest, otherAllowableExpenses],
  );
  const mortgageResult = useMemo(
    () =>
      calculateMortgageVsIsa(
        mortgageBalance,
        mortgageRate,
        remainingYears,
        monthlyOverpay,
        expectedIsaReturn,
      ),
    [mortgageBalance, mortgageRate, remainingYears, monthlyOverpay, expectedIsaReturn],
  );
  const overdraftResult = useMemo(
    () => calculateOverdraftCost(overdraftAmount, overdraftEar),
    [overdraftAmount, overdraftEar],
  );
  const studentLoanResult = useMemo(
    () => evaluateUkStudentLoan("plan2", graduateSalary, studentLoanBalance),
    [graduateSalary, studentLoanBalance],
  );

  const handleSaveToFlump = () => {
    let payload: Record<string, any> = {
      timestamp: Date.now(),
      inferredModules: ["budget", "forecast"],
    };

    if (slug === "uk-100k-tax-trap-calculator") {
      payload = {
        ...payload,
        annualIncome: trapSalary,
        inferredModules: ["tax", "pension", "forecast"],
      };
    } else if (
      slug === "uk-debt-snowball-vs-avalanche-calculator" ||
      slug === "0-percent-balance-transfer-payoff-calculator" ||
      slug === "overdraft-cost-and-payoff-calculator"
    ) {
      payload = {
        ...payload,
        inferredModules: ["debt", "budget", "accounts"],
      };
    } else if (slug === "section-24-landlord-tax-calculator") {
      payload = {
        ...payload,
        annualIncome: employmentIncome,
        mortgageBalance: 200000,
        inferredModules: ["mortgage", "tax", "accounts"],
      };
    } else if (slug === "mortgage-overpayment-vs-isa-calculator") {
      payload = {
        ...payload,
        mortgageBalance,
        inferredModules: ["mortgage", "savings", "forecast"],
      };
    }

    persistOnboardingSeed(payload as any);

    if (typeof document !== "undefined") {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      const domain =
        typeof window !== "undefined" && window.location.hostname.includes("flump.co.uk")
          ? "; domain=.flump.co.uk"
          : "";
      document.cookie = `flump_onboarding_seed=${encoded}; path=/; max-age=2592000; SameSite=Lax${domain}`;
    }

    if (typeof window !== "undefined") {
      window.location.href = `${appUrl}/signup`;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>{toolMeta.title} | Free UK Calculator | Flump</title>
        <meta name="description" content={toolMeta.desc} />
        <link rel="canonical" href={`https://flump.co.uk/tools/${toolMeta.slug}`} />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          {/* Breadcrumb / Back Link */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              to="/tools"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#6363f1",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <FiArrowLeft /> All UK Calculators
            </Link>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                backgroundColor: "#e0e7ff",
                color: "#4338ca",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {toolMeta.badge}
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "12px",
                marginBottom: "8px",
              }}
            >
              {toolMeta.title}
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                maxWidth: "750px",
                lineHeight: "1.6",
              }}
            >
              {toolMeta.desc}
            </p>
          </div>

          {/* Calculator Container */}
          <div className={cardStyle}>
            {/* 1. £100k Tax Trap */}
            {slug === "uk-100k-tax-trap-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Gross Annual Income (UK EWNI)</span>
                      <span style={{ color: "#6363f1", fontWeight: "700" }}>
                        £{trapSalary.toLocaleString()}
                      </span>
                    </span>
                    <input
                      type="range"
                      min="95000"
                      max="140000"
                      step="1000"
                      value={trapSalary}
                      onChange={(e) => setTrapSalary(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>

                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Proposed Pension Salary Sacrifice</span>
                      <span style={{ color: "#10b981", fontWeight: "700" }}>
                        £{trapSacrifice.toLocaleString()}
                      </span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="40000"
                      step="500"
                      value={trapSacrifice}
                      onChange={(e) => setTrapSacrifice(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#10b981" }}
                    />
                  </label>
                </div>

                <div
                  className={resultBoxStyle}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div className={stack({ gap: "3" })}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--colors-text-muted, #64748b)",
                      }}
                    >
                      HMRC Personal Allowance Status
                    </div>
                    <div
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: "800",
                        color: "var(--colors-text-primary, #0f172a)",
                      }}
                    >
                      {trapResult.isInTaxTrap ? (
                        <span style={{ color: "#ef4444" }}>60% Marginal Rate Trap</span>
                      ) : (
                        <span style={{ color: "#10b981" }}>Protected / Reclaimed</span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--colors-text-muted, #475569)",
                        lineHeight: "1.6",
                      }}
                    >
                      {trapResult.isInTaxTrap
                        ? `Your current income triggers a £${trapResult.lostPersonalAllowance.toLocaleString()} reduction in Personal Allowance. Sacrificing £${trapResult.recommendedSacrifice.toLocaleString()} into your pension reclaims £${trapResult.estimatedTaxSaved.toLocaleString()} in tax relief.`
                        : `Your adjusted net income is at or below £100,000. Your full £12,570 tax-free allowance and funded childcare eligibility are preserved.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Debt Snowball vs Avalanche */}
            {slug === "uk-debt-snowball-vs-avalanche-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Extra Monthly Debt Budget</span>
                      <span style={{ color: "#10b981", fontWeight: "700" }}>
                        £{extraPayment}/mo
                      </span>
                    </span>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#10b981" }}
                    />
                  </label>
                  <div style={{ fontSize: "13px", color: "var(--colors-text-muted, #64748b)" }}>
                    Comparing sample debts (£3.5k card @ 24.9%, £1.2k store card @ 29.9%, £5k loan @
                    7.9%).
                  </div>
                </div>

                <div className={resultBoxStyle}>
                  <div className={grid({ columns: 2, gap: "4" })}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#6363f1" }}>
                        AVALANCHE (HIGH APR)
                      </div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "800",
                          color: "var(--colors-text-primary, #0f172a)",
                        }}
                      >
                        {avalancheResult.months} mos
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
                        Interest: £{avalancheResult.totalInterest.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#10b981" }}>
                        SNOWBALL (LOW BAL)
                      </div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "800",
                          color: "var(--colors-text-primary, #0f172a)",
                        }}
                      >
                        {snowballResult.months} mos
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
                        Interest: £{snowballResult.totalInterest.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. 0% Balance Transfer */}
            {slug === "0-percent-balance-transfer-payoff-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Balance Transferred</span>
                      <span style={{ fontWeight: "700" }}>£{transferBalance.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="1000"
                      max="20000"
                      step="500"
                      value={transferBalance}
                      onChange={(e) => setTransferBalance(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Promo Period</span>
                      <span>{promoMonths} Months</span>
                    </span>
                    <input
                      type="range"
                      min="6"
                      max="36"
                      step="3"
                      value={promoMonths}
                      onChange={(e) => setPromoMonths(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>
                </div>
                <div className={resultBoxStyle}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--colors-text-muted, #64748b)",
                    }}
                  >
                    MONTHLY TARGET TO BEAT THE CLIFF
                  </div>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "800",
                      color: "#10b981",
                      margin: "8px 0",
                    }}
                  >
                    £{Math.round(transferResult.requiredMonthlyPayment).toLocaleString()}/mo
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #475569)",
                      lineHeight: "1.6",
                    }}
                  >
                    Pay £{Math.round(transferResult.requiredMonthlyPayment)} each month to clear the
                    debt before the 0% window expires. Failing to clear leaves penalty interest of
                    ~£
                    {Math.round(transferResult.penaltyInterestFirstYearIfUnpaid).toLocaleString()}{" "}
                    in year one.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Section 24 Landlord */}
            {slug === "section-24-landlord-tax-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Gross Rental Income</span>
                      <span>£{rentalIncome.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="6000"
                      max="60000"
                      step="1000"
                      value={rentalIncome}
                      onChange={(e) => setRentalIncome(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>BTL Mortgage Interest</span>
                      <span>£{btlMortgageInterest.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="2000"
                      max="30000"
                      step="500"
                      value={btlMortgageInterest}
                      onChange={(e) => setBtlMortgageInterest(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>
                </div>
                <div className={resultBoxStyle}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--colors-text-muted, #64748b)",
                    }}
                  >
                    SECTION 24 EFFECTIVE TAX
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      color: "#ef4444",
                      margin: "8px 0",
                    }}
                  >
                    £{Math.round(section24Result.finalTaxDue).toLocaleString()} Tax Due
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #475569)",
                      lineHeight: "1.6",
                    }}
                  >
                    Section 24 disallows deducting mortgage interest as an expense, only offering a
                    20% tax credit (£
                    {Math.round(section24Result.financeCredit).toLocaleString()}). Net cash return
                    after tax: £
                    {Math.round(section24Result.netRentalIncomeAfterTax).toLocaleString()}{" "}
                    (effective tax rate: {section24Result.effectiveTaxRate}%).
                  </p>
                </div>
              </div>
            )}

            {/* 5. Mortgage vs ISA */}
            {slug === "mortgage-overpayment-vs-isa-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Monthly Overpay / Investment</span>
                      <span style={{ fontWeight: "700", color: "#10b981" }}>
                        £{monthlyOverpay}/mo
                      </span>
                    </span>
                    <input
                      type="range"
                      min="50"
                      max="1500"
                      step="25"
                      value={monthlyOverpay}
                      onChange={(e) => setMonthlyOverpay(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#10b981" }}
                    />
                  </label>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Mortgage Rate: {mortgageRate}%</span>
                      <span>Expected ISA APY: {expectedIsaReturn}%</span>
                    </span>
                    <input
                      type="range"
                      min="2.0"
                      max="7.5"
                      step="0.1"
                      value={mortgageRate}
                      onChange={(e) => setMortgageRate(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#6363f1" }}
                    />
                  </label>
                </div>
                <div className={resultBoxStyle}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--colors-text-muted, #64748b)",
                    }}
                  >
                    NET WEALTH COMPARISON ({remainingYears} YEARS)
                  </div>
                  <div
                    style={{
                      fontSize: "1.7rem",
                      fontWeight: "800",
                      color: "var(--colors-text-primary, #0f172a)",
                      margin: "8px 0",
                    }}
                  >
                    ISA Delta: +£{Math.round(mortgageResult.netWealthDelta).toLocaleString()}
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #475569)",
                      lineHeight: "1.6",
                    }}
                  >
                    Overpaying saves £{Math.round(mortgageResult.interestSaved).toLocaleString()} in
                    guaranteed interest. Investing in a Stocks & Shares ISA at {expectedIsaReturn}%
                    produces £{Math.round(mortgageResult.isaAccumulatedValue).toLocaleString()} in
                    compounding wealth.
                  </p>
                </div>
              </div>
            )}

            {/* 6. Overdraft Cost */}
            {slug === "overdraft-cost-and-payoff-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Overdraft Balance</span>
                      <span>£{overdraftAmount.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="250"
                      max="5000"
                      step="50"
                      value={overdraftAmount}
                      onChange={(e) => setOverdraftAmount(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#ef4444" }}
                    />
                  </label>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Annual Percentage Rate (EAR)</span>
                      <span>{overdraftEar}%</span>
                    </span>
                    <input
                      type="range"
                      min="19.9"
                      max="49.9"
                      step="1"
                      value={overdraftEar}
                      onChange={(e) => setOverdraftEar(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#ef4444" }}
                    />
                  </label>
                </div>
                <div className={resultBoxStyle}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--colors-text-muted, #64748b)",
                    }}
                  >
                    COMPOUND {overdraftEar}% EAR COST
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      color: "#ef4444",
                      margin: "8px 0",
                    }}
                  >
                    £{Math.round(overdraftResult.annualPoundCost).toLocaleString()} / year
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #475569)",
                      lineHeight: "1.6",
                    }}
                  >
                    Maintaining a £{overdraftAmount} arranged overdraft costs approximately £
                    {Math.round(overdraftResult.monthlyPoundCost)} per month in finance charges.
                  </p>
                </div>
              </div>
            )}

            {/* 7. Student Loan */}
            {slug === "uk-student-loan-overpay-or-invest-calculator" && (
              <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
                <div>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Graduate Salary</span>
                      <span>£{graduateSalary.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="25000"
                      max="90000"
                      step="1000"
                      value={graduateSalary}
                      onChange={(e) => setGraduateSalary(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#06b6d4" }}
                    />
                  </label>
                  <label className={inputGroupStyle}>
                    <span className={labelStyle}>
                      <span>Student Loan Balance</span>
                      <span>£{studentLoanBalance.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="10000"
                      max="80000"
                      step="1000"
                      value={studentLoanBalance}
                      onChange={(e) => setStudentLoanBalance(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#06b6d4" }}
                    />
                  </label>
                </div>
                <div className={resultBoxStyle}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--colors-text-muted, #64748b)",
                    }}
                  >
                    GRADUATE TAX MODEL (PLAN 2)
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      color: "var(--colors-text-primary, #0f172a)",
                      margin: "8px 0",
                    }}
                  >
                    £{Math.round(studentLoanResult.monthlyRepayment).toLocaleString()}/mo
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #475569)",
                      lineHeight: "1.6",
                    }}
                  >
                    HMRC deducts 9% above the £27,295 threshold (£
                    {Math.round(studentLoanResult.annualRepayment).toLocaleString()}/year).{" "}
                    {studentLoanResult.willLikelyRepayBeforeWriteOff
                      ? "Because your projected earnings clear the balance early, aggressive repayment saves accumulated interest."
                      : "Unless you anticipate top-tier salary growth, the balance will be written off after 30 years; voluntary overpayments are effectively wasted."}
                  </p>
                </div>
              </div>
            )}

            {/* Single-Variable Teaser CTA Handoff */}
            <div className={teaserHandoffStyle}>
              <div
                className={flex({
                  justify: "space-between",
                  align: "center",
                  flexWrap: "wrap",
                  gap: "4",
                })}
              >
                <div style={{ maxWidth: "560px" }}>
                  <h4
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      color: "var(--colors-text-primary, #3730a3)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Want to see how this impacts your 20-year net worth, ISA allowance, and monthly
                    budget?
                  </h4>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-text-muted, #4338ca)",
                      margin: 0,
                    }}
                  >
                    In Flump, this calculation connects directly to your live bank accounts,
                    mortgage schedule, and HMRC liability.
                  </p>
                </div>
                <Button size="md" variant="primary" onClick={handleSaveToFlump}>
                  Open this calculation in your Flump workspace →
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
