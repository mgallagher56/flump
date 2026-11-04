import { persistOnboardingSeed } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", sm: "32px" },
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
  marginBottom: "40px",
});

const inputGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
  gap: "20px",
  marginBottom: "24px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const sliderStyle = css({
  width: "100%",
  accentColor: "#6366f1",
  cursor: "pointer",
  height: "6px",
});

const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "16px",
  marginTop: "24px",
  marginBottom: "24px",
});

const metricCard = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const Section24Tool: FC = () => {
  const navigate = useNavigate();
  const [rentalIncome, setRentalIncome] = useState<number>(18000);
  const [mortgageInterest, setMortgageInterest] = useState<number>(8000);
  const [allowableExpenses, setAllowableExpenses] = useState<number>(2000);
  const [otherIncome, setOtherIncome] = useState<number>(60000);

  const calc = useMemo(() => {
    // Real cash profit
    const actualCashProfit = Math.max(0, rentalIncome - mortgageInterest - allowableExpenses);

    // Section 24 taxable profit (finance costs cannot be deducted)
    const section24TaxableProfit = Math.max(0, rentalIncome - allowableExpenses);

    // Determine tax rate on property profit given other income
    // UK basic rate band ends at ~£50,270
    const isHigherRate = otherIncome >= 50270;
    const taxRate = isHigherRate ? 0.4 : 0.2;

    const grossTaxOnProperty = section24TaxableProfit * taxRate;

    // 20% basic rate finance costs credit
    const financeCredit = Math.max(0, mortgageInterest * 0.2);

    // Final tax due
    const finalTaxDue = Math.max(0, grossTaxOnProperty - financeCredit);

    // Old rules (pre-Section 24): taxed purely on actual cash profit
    const oldRulesTax = actualCashProfit * taxRate;
    const section24Penalty = Math.max(0, finalTaxDue - oldRulesTax);

    // Effective tax rate on true profit
    const effectiveTaxRate =
      actualCashProfit > 0
        ? Math.min(100, Math.round((finalTaxDue / actualCashProfit) * 100))
        : 100;

    const netCashInPocket = Math.max(0, actualCashProfit - finalTaxDue);

    return {
      actualCashProfit,
      section24TaxableProfit,
      grossTaxOnProperty,
      financeCredit,
      finalTaxDue,
      oldRulesTax,
      section24Penalty,
      effectiveTaxRate,
      netCashInPocket,
      isHigherRate,
    };
  }, [rentalIncome, mortgageInterest, allowableExpenses, otherIncome]);

  const handleSaveAndContinue = () => {
    persistOnboardingSeed({
      annualIncome: otherIncome,
      initialCashSavings: 500,
      mortgageBalance: 200000,
      inferredModules: ["tax", "mortgage", "forecast"],
      timestamp: Date.now(),
    });
    navigate("/signUp");
  };

  return (
    <div className={cardStyle} data-testid="section-24-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "full",
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              color: "#3b82f6",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            HMRC Landlord Tax Rules
          </span>
        </div>
        <FLPHeading as="h2" color="text.primary" mb={1} size="xl">
          Section 24 Buy-to-Let Mortgage Relief Calculator
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Calculate phantom taxable rental profit and the 20% basic rate tax credit reduction
          introduced by Section 24 of the Finance (No. 2) Act 2015.
        </FLPText>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="rental-income" style={{ fontSize: "13px", fontWeight: 600 }}>
              Annual Rental Income
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#3b82f6" }}>
              £{rentalIncome.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="rental-income"
            max={60000}
            min={5000}
            onChange={(e) => setRentalIncome(Number(e.target.value))}
            step={500}
            type="range"
            value={rentalIncome}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="mortgage-interest" style={{ fontSize: "13px", fontWeight: 600 }}>
              Annual Mortgage Interest (Finance Costs)
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#ef4444" }}>
              £{mortgageInterest.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-interest"
            max={35000}
            min={1000}
            onChange={(e) => setMortgageInterest(Number(e.target.value))}
            step={500}
            type="range"
            value={mortgageInterest}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="allowable-expenses" style={{ fontSize: "13px", fontWeight: 600 }}>
              Other Allowable Expenses (Repairs, Insurance, Agent Fees)
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#64748b" }}>
              £{allowableExpenses.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="allowable-expenses"
            max={15000}
            min={0}
            onChange={(e) => setAllowableExpenses(Number(e.target.value))}
            step={250}
            type="range"
            value={allowableExpenses}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="other-income" style={{ fontSize: "13px", fontWeight: 600 }}>
              Other Annual Income (Salary / Self-Employed)
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#6366f1" }}>
              £{otherIncome.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="other-income"
            max={150000}
            min={20000}
            onChange={(e) => setOtherIncome(Number(e.target.value))}
            step={2500}
            type="range"
            value={otherIncome}
          />
        </div>
      </div>

      {/* Results */}
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            HMRC Tax Due on Rental
          </span>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#ef4444" }}>
            £{Math.round(calc.finalTaxDue).toLocaleString("en-GB")}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            (Gross tax £{Math.round(calc.grossTaxOnProperty).toLocaleString("en-GB")} minus £
            {Math.round(calc.financeCredit).toLocaleString("en-GB")} credit)
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            True Effective Tax Rate
          </span>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#f59e0b" }}>
            {calc.effectiveTaxRate}%
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Tax paid relative to your £{Math.round(calc.actualCashProfit).toLocaleString("en-GB")}{" "}
            real cash profit
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            Net Cash Retained
          </span>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#10b981" }}>
            £{Math.round(calc.netCashInPocket).toLocaleString("en-GB")} / yr
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            £{Math.round(calc.netCashInPocket / 12).toLocaleString("en-GB")}/mo cash in pocket after
            tax & mortgage
          </span>
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingTop: "20px",
          borderTop: "1px solid var(--colors-border)",
        }}
      >
        <div style={{ maxWidth: "440px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--colors-text-primary)" }}>
            Need automated HMRC Self-Assessment & property tax tracking?
          </span>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Flump automatically models Section 24 adjustments, joint spousal splits, and Payments on
            Account.
          </p>
        </div>

        <FLPButton onClick={handleSaveAndContinue} size="lg">
          Track Your Properties in Flump <FiArrowRight aria-hidden="true" />
        </FLPButton>
      </div>
    </div>
  );
};

export default Section24Tool;
