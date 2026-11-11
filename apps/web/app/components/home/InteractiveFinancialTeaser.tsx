import {
  calculateMortgageAmortization,
  calculateUkTax,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FiAlertCircle, FiArrowRight, FiPercent, FiTrendingUp } from "react-icons/fi";
import { useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "4xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const teaserCardStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  boxShadow: "floating",
  overflow: "hidden",
  transition: "border-color 0.2s ease",
});

const tabListStyle = css({
  display: "flex",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: { base: "slate.100", _dark: "dark.subtle" },
  overflowX: "auto",
});

const tabButtonStyle = (active: boolean) =>
  css({
    flex: 1,
    minWidth: "200px",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "sm",
    fontWeight: active ? "bold" : "medium",
    color: active ? "primary" : "text.secondary",
    backgroundColor: active ? "card" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid" : "2px solid transparent",
    borderBottomColor: active ? "primary" : "transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      color: "text.primary",
    },
    "&:focus-visible": {
      outline: "2px solid token(colors.primary)",
      outlineOffset: "-2px",
    },
  });

const panelContainerStyle = css({
  padding: { base: "20px", md: "32px" },
});

const splitGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1.1fr 0.9fr" },
  gap: "32px",
  alignItems: "center",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "20px",
});

const labelStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.muted",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

const inputWrapperStyle = css({
  display: "flex",
  alignItems: "center",
  position: "relative",
});

const currencyPrefixStyle = css({
  position: "absolute",
  left: "14px",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "text.muted",
  pointerEvents: "none",
});

const textInputStyle = css({
  width: "100%",
  padding: "12px 14px 12px 32px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "md",
  fontWeight: "medium",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  "&:focus": {
    borderColor: "primary",
    boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.15)",
  },
});

const chipRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "8px",
});

const chipButtonStyle = (active: boolean) =>
  css({
    padding: "6px 12px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "semibold",
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "rgba(99, 102, 241, 0.12)" : "surface.subtle",
    color: active ? "primary" : "text.secondary",
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "primary",
      color: "primary",
    },
  });

const resultBoxStyle = css({
  padding: "24px",
  borderRadius: "xl",
  backgroundColor: { base: "slate.50", _dark: "dark.subtle" },
  border: "1px solid",
  borderColor: "border",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  boxShadow: "xs",
});

const statRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "sm",
  borderBottom: "1px solid",
  borderColor: "border",
  paddingBottom: "10px",
  "&:last-child": {
    borderBottom: "none",
    paddingBottom: 0,
  },
});

const highlightValueStyle = css({
  fontSize: "2xl",
  fontWeight: "bold",
  color: "primary",
  letterSpacing: "-0.02em",
});

const alertTaperStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "12px 14px",
  borderRadius: "lg",
  backgroundColor: "rgba(245, 158, 11, 0.1)",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  color: "warning.600",
  fontSize: "xs",
  lineHeight: "1.4",
});

const formatGBP = (num: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(num);

export const InteractiveFinancialTeaser: FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"tax" | "mortgage">("tax");

  const handleSaveTaxSeed = (incomeAmount: number) => {
    const payload: OnboardingSeedPayload = {
      annualIncome: incomeAmount,
      pensionContributionPct: 5,
      salarySacrifice: true,
      initialCashSavings: 15000,
      initialInvestments: 20000,
      monthlyContribution: 500,
      inferredModules: [
        "accounts",
        "budget",
        "pension",
        "forecast",
        ...(incomeAmount >= 95000 ? (["tax"] as const) : []),
      ],
      timestamp: Date.now(),
    };
    persistOnboardingSeed(payload);
    navigate("/signUp");
  };

  const handleSaveMortgageSeed = (balance: number) => {
    const payload: OnboardingSeedPayload = {
      annualIncome: 65000,
      pensionContributionPct: 5,
      salarySacrifice: true,
      initialCashSavings: 15000,
      initialInvestments: 15000,
      monthlyContribution: 500,
      mortgageBalance: balance,
      inferredModules: ["accounts", "budget", "mortgage", "forecast"],
      timestamp: Date.now(),
    };
    persistOnboardingSeed(payload);
    navigate("/signUp");
  };

  // Tax state
  const [income, setIncome] = useState<number>(65000);

  // Mortgage state
  const [mortgageBalance, setMortgageBalance] = useState<number>(250000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [monthlyOverpayment, setMonthlyOverpayment] = useState<number>(200);

  const incomeInputId = useId();
  const mortgageBalanceId = useId();
  const interestRateId = useId();
  const overpaymentId = useId();

  // UK Tax calculations
  const taxResults = useMemo(() => {
    const gross = Math.max(0, income);
    const tax = calculateUkTax({ grossSalary: gross });

    return {
      gross,
      allowance: tax.taxTrap.effectivePersonalAllowanceGbp,
      incomeTax: tax.incomeTaxGbp,
      nationalInsurance: tax.nationalInsuranceGbp,
      totalDeductions: tax.totalDeductionsGbp,
      annualNet: tax.netTakeHomePayAnnualGbp,
      monthlyNet: tax.netTakeHomePayMonthlyGbp,
      effectiveTaxRate: tax.effectiveTaxRatePct,
      isTaperActive: tax.taxTrap.isInTaxTrap || gross > 100000,
    };
  }, [income]);

  // Mortgage calculations
  const mortgageResults = useMemo(() => {
    const P = Math.max(1000, mortgageBalance);
    const termMonths = 25 * 12;
    const amortization = calculateMortgageAmortization({
      propertyValueGbp: P * 1.25,
      currentBalanceGbp: P,
      interestRateApr: interestRate,
      remainingTermMonths: termMonths,
      monthlyOverpaymentGbp: monthlyOverpayment,
    });

    const monthsSaved = amortization.monthsSaved;
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    return {
      monthlyStandard: amortization.monthlyPaymentGbp,
      monthlyWithOverpayment: amortization.monthlyPaymentGbp + monthlyOverpayment,
      standardInterest: amortization.totalInterestStandardGbp,
      yearsSaved,
      remainingMonthsSaved,
      totalInterestSaved: amortization.interestSavedGbp,
    };
  }, [mortgageBalance, interestRate, monthlyOverpayment]);

  return (
    <div className={containerStyle} id="interactive-demo">
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <FLPHeading as="h2" color="text.primary" mb={2} size="3xl">
          Test the calculation engines live
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Enter your figures to see real HMRC marginal tax rates and mortgage amortisation
          schedules.
        </FLPText>
      </div>

      <div className={teaserCardStyle}>
        <div aria-label="Calculation tools" className={tabListStyle} role="tablist">
          <button
            aria-controls="panel-tax"
            aria-selected={activeTab === "tax"}
            className={tabButtonStyle(activeTab === "tax")}
            id="tab-tax"
            role="tab"
            type="button"
            onClick={() => setActiveTab("tax")}
          >
            <FiPercent aria-hidden="true" /> UK PAYE and 60% tax trap
          </button>
          <button
            aria-controls="panel-mortgage"
            aria-selected={activeTab === "mortgage"}
            className={tabButtonStyle(activeTab === "mortgage")}
            id="tab-mortgage"
            role="tab"
            type="button"
            onClick={() => setActiveTab("mortgage")}
          >
            <FiTrendingUp aria-hidden="true" /> Mortgage overpayment savings
          </button>
        </div>

        <div className={panelContainerStyle}>
          {activeTab === "tax" && (
            <div
              aria-labelledby="tab-tax"
              className={splitGridStyle}
              id="panel-tax"
              role="tabpanel"
            >
              <div>
                <div className={inputGroupStyle}>
                  <label className={labelStyle} htmlFor={incomeInputId}>
                    Annual gross salary (PAYE)
                  </label>
                  <div className={inputWrapperStyle}>
                    <span className={currencyPrefixStyle}>£</span>
                    <input
                      className={textInputStyle}
                      id={incomeInputId}
                      max={300000}
                      min={10000}
                      step={1000}
                      type="number"
                      value={income}
                      onChange={(e) => setIncome(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className={chipRowStyle}>
                    {[38000, 65000, 115000, 145000].map((preset) => (
                      <button
                        key={preset}
                        className={chipButtonStyle(income === preset)}
                        type="button"
                        onClick={() => setIncome(preset)}
                      >
                        {formatGBP(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                {taxResults.isTaperActive && (
                  <div className={alertTaperStyle}>
                    <FiAlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong>£100k+ Personal Allowance taper active</strong>
                      <p style={{ margin: "4px 0 0" }}>
                        Allowance reduced to {formatGBP(taxResults.allowance)}. Earnings between
                        £100k–£125k face an effective 60% marginal income tax rate.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className={resultBoxStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={labelStyle}>Net take-home pay</span>
                  <div className={highlightValueStyle}>
                    {formatGBP(taxResults.monthlyNet)}{" "}
                    <span style={{ fontSize: "sm", fontWeight: "normal", color: "text.muted" }}>
                      / month
                    </span>
                  </div>
                  <FLPText color="text.muted" fontSize="xs">
                    {formatGBP(taxResults.annualNet)} annually after UK tax and National Insurance
                  </FLPText>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>Income tax:</span>
                  <strong style={{ color: "text.primary" }}>
                    {formatGBP(taxResults.incomeTax)}
                  </strong>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>National Insurance:</span>
                  <strong style={{ color: "text.primary" }}>
                    {formatGBP(taxResults.nationalInsurance)}
                  </strong>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>Personal Allowance:</span>
                  <span style={{ color: "text.primary", fontWeight: "medium" }}>
                    {formatGBP(taxResults.allowance)}
                  </span>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>Effective tax and NI rate:</span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: taxResults.effectiveTaxRate > 35 ? "#ef4444" : "primary",
                    }}
                  >
                    {taxResults.effectiveTaxRate.toFixed(1)}%
                  </span>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <FLPButton
                    size="md"
                    onClick={() => handleSaveTaxSeed(income)}
                    style={{
                      width: "100%",
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "600",
                    }}
                  >
                    Save this salary baseline <FiArrowRight aria-hidden="true" />
                  </FLPButton>
                </div>
              </div>
            </div>
          )}

          {activeTab === "mortgage" && (
            <div
              aria-labelledby="tab-mortgage"
              className={splitGridStyle}
              id="panel-mortgage"
              role="tabpanel"
            >
              <div>
                <div className={inputGroupStyle}>
                  <label className={labelStyle} htmlFor={mortgageBalanceId}>
                    Remaining mortgage balance
                  </label>
                  <div className={inputWrapperStyle}>
                    <span className={currencyPrefixStyle}>£</span>
                    <input
                      className={textInputStyle}
                      id={mortgageBalanceId}
                      step={5000}
                      type="number"
                      value={mortgageBalance}
                      onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className={chipRowStyle}>
                    {[175000, 250000, 420000].map((preset) => (
                      <button
                        key={preset}
                        className={chipButtonStyle(mortgageBalance === preset)}
                        type="button"
                        onClick={() => setMortgageBalance(preset)}
                      >
                        {formatGBP(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={inputGroupStyle}>
                    <label className={labelStyle} htmlFor={interestRateId}>
                      Interest rate (%)
                    </label>
                    <input
                      className={textInputStyle}
                      id={interestRateId}
                      max={12}
                      min={0.5}
                      step={0.1}
                      style={{ paddingLeft: "14px" }}
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className={inputGroupStyle}>
                    <label className={labelStyle} htmlFor={overpaymentId}>
                      Monthly overpayment (£)
                    </label>
                    <input
                      className={textInputStyle}
                      id={overpaymentId}
                      max={2000}
                      min={0}
                      step={50}
                      style={{ paddingLeft: "14px" }}
                      type="number"
                      value={monthlyOverpayment}
                      onChange={(e) => setMonthlyOverpayment(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className={resultBoxStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={labelStyle}>Total interest saved</span>
                  <div className={highlightValueStyle} style={{ color: "#10b981" }}>
                    {formatGBP(mortgageResults.totalInterestSaved)}
                  </div>
                  <FLPText color="text.muted" fontSize="xs">
                    Illustrative interest eliminated by overpaying £{monthlyOverpayment}/mo
                  </FLPText>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>Standard repayment:</span>
                  <span style={{ color: "text.primary", fontWeight: "medium" }}>
                    {formatGBP(mortgageResults.monthlyStandard)} / month
                  </span>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>Mortgage term reduced:</span>
                  <strong style={{ color: "primary" }}>
                    {mortgageResults.yearsSaved} yrs {mortgageResults.remainingMonthsSaved} mos
                  </strong>
                </div>

                <div className={statRowStyle}>
                  <span style={{ color: "text.muted" }}>New total monthly:</span>
                  <strong style={{ color: "text.primary" }}>
                    {formatGBP(mortgageResults.monthlyWithOverpayment)} / month
                  </strong>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <FLPButton
                    size="md"
                    onClick={() => handleSaveMortgageSeed(mortgageBalance)}
                    style={{
                      width: "100%",
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "600",
                    }}
                  >
                    Save this mortgage baseline <FiArrowRight aria-hidden="true" />
                  </FLPButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveFinancialTeaser;
