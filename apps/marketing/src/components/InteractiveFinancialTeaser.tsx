import {
  calculateMortgageAmortization,
  calculateUkTax,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FiAlertCircle, FiArrowRight, FiPercent, FiTrendingUp } from "react-icons/fi";
import { getAppUrl } from "../utils/url";

const containerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  paddingY: { base: "64px", md: "80px" },
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
  backgroundColor: "surface.subtle",
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
    fontWeight: active ? "semibold" : "medium",
    color: active ? "primary" : "text.secondary",
    backgroundColor: active ? "card" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid" : "2px solid transparent",
    borderBottomColor: active ? "primary" : "transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      color: "primary",
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
  color: "text.secondary",
  letterSpacing: "0.01em",
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
  color: "text.secondary",
  pointerEvents: "none",
});

const textInputStyle = css({
  width: "100%",
  padding: "12px 14px 12px 32px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "card",
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
    fontWeight: "medium",
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "surface.tinted" : "surface.subtle",
    color: active ? "primary" : "text.secondary",
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "primary",
      color: "text.primary",
    },
  });

const resultBoxStyle = css({
  padding: "24px",
  borderRadius: "xl",
  backgroundColor: "surface.subtle",
  border: "1px solid",
  borderColor: "border",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

const statRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "sm",
  borderBottom: "1px dashed",
  borderColor: "border",
  paddingBottom: "8px",
});

const highlightValueStyle = css({
  fontSize: { base: "2rem", md: "2.25rem" },
  fontWeight: "800",
  fontFamily: "var(--fonts-mono)",
  color: "text.primary",
  lineHeight: "1.1",
});

const alertTaperStyle = css({
  backgroundColor: "rgba(245, 158, 11, 0.1)",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  borderRadius: "lg",
  padding: "12px 16px",
  color: "text.primary",
  fontSize: "xs",
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  marginTop: "16px",
});

function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const InteractiveFinancialTeaser: FC = () => {
  const [activeTab, setActiveTab] = useState<"tax" | "mortgage">("tax");
  const [income, setIncome] = useState<number>(115000);
  const [mortgageBalance, setMortgageBalance] = useState<number>(250000);
  const [interestRate, setInterestRate] = useState<number>(4.8);
  const [monthlyOverpayment, setMonthlyOverpayment] = useState<number>(200);

  const incomeInputId = useId();
  const mortgageBalanceId = useId();
  const interestRateId = useId();
  const overpaymentId = useId();
  const appUrl = getAppUrl();

  const taxResults = useMemo(() => {
    const gross = Math.max(0, income);
    const tax = calculateUkTax({ grossSalary: gross });

    return {
      annualNet: tax.netTakeHomePayAnnualGbp,
      monthlyNet: tax.netTakeHomePayMonthlyGbp,
      incomeTax: tax.incomeTaxGbp,
      nationalInsurance: tax.nationalInsuranceGbp,
      allowance: tax.taxTrap.effectivePersonalAllowanceGbp,
      effectiveTaxRate: tax.effectiveTaxRatePct,
      isTaperActive: tax.taxTrap.isInTaxTrap || gross > 100000,
    };
  }, [income]);

  const mortgageResults = useMemo(() => {
    const P = Math.max(1000, mortgageBalance);
    const totalMonths = 25 * 12;
    const amortization = calculateMortgageAmortization({
      propertyValueGbp: P * 1.25,
      currentBalanceGbp: P,
      interestRateApr: interestRate,
      remainingTermMonths: totalMonths,
      monthlyOverpaymentGbp: monthlyOverpayment,
    });

    const monthsSaved = amortization.monthsSaved;
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    return {
      monthlyStandard: amortization.monthlyPaymentGbp,
      monthlyWithOverpayment: amortization.monthlyPaymentGbp + monthlyOverpayment,
      totalInterestSaved: amortization.interestSavedGbp,
      monthsSaved,
      yearsSaved,
      remainingMonthsSaved,
    };
  }, [mortgageBalance, interestRate, monthlyOverpayment]);

  const handleSaveTaxSeed = (gross: number) => {
    const payload: OnboardingSeedPayload = {
      timestamp: Date.now(),
      annualGrossSalary: gross,
      inferredModules: ["budget", "tax", "forecast"],
    };
    persistOnboardingSeed(payload);
    window.location.href = `${appUrl}/signUp`;
  };

  const handleSaveMortgageSeed = (balance: number) => {
    const payload: OnboardingSeedPayload = {
      timestamp: Date.now(),
      mortgageBalance: balance,
      housingStatus: "MORTGAGE",
      inferredModules: ["mortgage", "budget", "forecast"],
    };
    persistOnboardingSeed(payload);
    window.location.href = `${appUrl}/signUp`;
  };

  return (
    <section
      id="live-calculators"
      aria-label="Interactive UK financial calculator"
      style={{
        backgroundColor: "var(--colors-surface-tinted)",
        borderTop: "1px solid var(--colors-border)",
        borderBottom: "1px solid var(--colors-border)",
      }}
    >
      <div className={containerStyle}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: "var(--colors-card)",
              border: "1px solid var(--colors-border)",
              color: "var(--colors-primary)",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.06em",
              fontFamily: "var(--fonts-mono)",
              marginBottom: "12px",
            }}
          >
            Live calculator
          </span>
          <h2
            style={{
              fontSize: "clamp(1.85rem, 3.2vw, 2.75rem)",
              fontWeight: "800",
              color: "var(--colors-text-primary)",
              fontFamily: "var(--fonts-display)",
              letterSpacing: "-0.03em",
              margin: "0 0 12px 0",
            }}
          >
            Test the live UK financial calculator
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--colors-text-secondary)",
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Enter your figures to see UK marginal tax rates and mortgage amortisation schedules.
          </p>
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
              <FiPercent size={16} />
              <span>UK PAYE and 60% tax trap</span>
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
              <FiTrendingUp size={16} />
              <span>Mortgage overpayment savings</span>
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
                        <p style={{ margin: "4px 0 0", lineHeight: "1.5" }}>
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
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "normal",
                          color: "var(--colors-text-secondary)",
                        }}
                      >
                        / month
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
                      {formatGBP(taxResults.annualNet)} annually after UK tax and National Insurance
                    </span>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>Income tax:</span>
                    <strong style={{ color: "var(--colors-text-primary)" }}>
                      {formatGBP(taxResults.incomeTax)}
                    </strong>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>
                      National Insurance:
                    </span>
                    <strong style={{ color: "var(--colors-text-primary)" }}>
                      {formatGBP(taxResults.nationalInsurance)}
                    </strong>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>
                      Effective tax and NI rate:
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        color:
                          taxResults.effectiveTaxRate > 35
                            ? "var(--colors-status-danger-text)"
                            : "var(--colors-primary)",
                      }}
                    >
                      {taxResults.effectiveTaxRate.toFixed(1)}%
                    </span>
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <Button
                      size="md"
                      variant="primary"
                      onClick={() => handleSaveTaxSeed(income)}
                      style={{
                        width: "100%",
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Save this salary baseline <FiArrowRight aria-hidden="true" />
                    </Button>
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
                    <div
                      className={highlightValueStyle}
                      style={{ color: "var(--colors-success-500, #10b981)" }}
                    >
                      {formatGBP(mortgageResults.totalInterestSaved)}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
                      Illustrative interest eliminated by overpaying £{monthlyOverpayment}/mo
                    </span>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>
                      Standard repayment:
                    </span>
                    <span style={{ color: "var(--colors-text-primary)", fontWeight: "medium" }}>
                      {formatGBP(mortgageResults.monthlyStandard)} / month
                    </span>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>
                      Mortgage term reduced:
                    </span>
                    <strong style={{ color: "var(--colors-primary)" }}>
                      {mortgageResults.yearsSaved} yrs {mortgageResults.remainingMonthsSaved} mos
                    </strong>
                  </div>

                  <div className={statRowStyle}>
                    <span style={{ color: "var(--colors-text-secondary)" }}>
                      New total monthly:
                    </span>
                    <strong style={{ color: "var(--colors-text-primary)" }}>
                      {formatGBP(mortgageResults.monthlyWithOverpayment)} / month
                    </strong>
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <Button
                      size="md"
                      variant="primary"
                      onClick={() => handleSaveMortgageSeed(mortgageBalance)}
                      style={{
                        width: "100%",
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Save this mortgage baseline <FiArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
