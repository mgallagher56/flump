import { calculateSection24LandlordTax, persistOnboardingSeed } from "@repo/common";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { css } from "../../styled-system/css/index.js";
import { Button } from "../components/forms/Button.js";

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

export interface Section24CalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const Section24Calculator: FC<Section24CalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track your properties in Flump free →",
}) => {
  const [rentalIncome, setRentalIncome] = useState<number>(18000);
  const [mortgageInterest, setMortgageInterest] = useState<number>(8000);
  const [allowableExpenses, setAllowableExpenses] = useState<number>(2000);
  const [otherIncome, setOtherIncome] = useState<number>(60000);

  const calc = useMemo(() => {
    const res = calculateSection24LandlordTax(
      otherIncome,
      rentalIncome,
      mortgageInterest,
      allowableExpenses,
      100,
    );
    const netCashInPocket =
      res.netRentalIncomeAfterTax ?? Math.max(0, res.actualCashProfit - res.finalTaxDue);
    return {
      ...res,
      netCashInPocket,
    };
  }, [rentalIncome, mortgageInterest, allowableExpenses, otherIncome]);

  const handleSave = () => {
    const payload = {
      annualIncome: otherIncome,
      initialCashSavings: 500,
      mortgageBalance: 200000,
      inferredModules: ["tax", "mortgage", "forecast"],
      timestamp: Date.now(),
    };
    persistOnboardingSeed(payload as any);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signUp";
    }
  };

  return (
    <div className={cardStyle} data-testid="section-24-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "9999px",
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
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--colors-text-primary, #0f172a)",
            margin: "0 0 4px 0",
          }}
        >
          Section 24 buy-to-let mortgage relief calculator
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--colors-text-muted, #64748b)", margin: 0 }}>
          Calculate phantom taxable rental profit and the 20% basic rate tax credit reduction
          introduced by Section 24 of the Finance (No. 2) Act 2015.
        </p>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="rental-income" style={{ fontSize: "13px", fontWeight: 600 }}>
              Gross annual rental income
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                £
              </span>
              <input
                id="rental-income"
                type="number"
                min={0}
                step={1000}
                value={rentalIncome}
                onChange={(e) => setRentalIncome(Number(e.target.value) || 0)}
                style={{
                  width: "100px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "#3b82f6",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="rental-income-slider"
            aria-label="Gross annual rental income slider"
            max={100000}
            min={6000}
            onChange={(e) => setRentalIncome(Number(e.target.value))}
            step={1000}
            type="range"
            value={rentalIncome}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="mortgage-interest" style={{ fontSize: "13px", fontWeight: 600 }}>
              Annual mortgage interest paid
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                £
              </span>
              <input
                id="mortgage-interest"
                type="number"
                min={0}
                step={500}
                value={mortgageInterest}
                onChange={(e) => setMortgageInterest(Number(e.target.value) || 0)}
                style={{
                  width: "100px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "#ef4444",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-interest-slider"
            aria-label="Annual mortgage interest paid slider"
            max={50000}
            min={0}
            onChange={(e) => setMortgageInterest(Number(e.target.value))}
            step={500}
            type="range"
            value={mortgageInterest}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="allowable-expenses" style={{ fontSize: "13px", fontWeight: 600 }}>
              Other allowable expenses (repairs, agent fees)
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                £
              </span>
              <input
                id="allowable-expenses"
                type="number"
                min={0}
                step={250}
                value={allowableExpenses}
                onChange={(e) => setAllowableExpenses(Number(e.target.value) || 0)}
                style={{
                  width: "90px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "var(--colors-text-secondary)",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="allowable-expenses-slider"
            aria-label="Other allowable expenses slider"
            max={15000}
            min={0}
            onChange={(e) => setAllowableExpenses(Number(e.target.value))}
            step={250}
            type="range"
            value={allowableExpenses}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="other-income" style={{ fontSize: "13px", fontWeight: 600 }}>
              Other annual taxable income (salary / profits)
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                £
              </span>
              <input
                id="other-income"
                type="number"
                min={0}
                step={2500}
                value={otherIncome}
                onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
                style={{
                  width: "100px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "#6366f1",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="other-income-slider"
            aria-label="Other annual taxable income slider"
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
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: 600,
            }}
          >
            HMRC tax due on rental
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-destructive-500, #ef4444)",
            }}
          >
            £{Math.round(calc.finalTaxDue).toLocaleString("en-GB")}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}
          >
            (Gross tax £{Math.round(calc.grossTaxOnProperty).toLocaleString("en-GB")} minus £
            {Math.round(calc.financeCredit).toLocaleString("en-GB")} credit)
          </span>
        </div>

        <div className={metricCard}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: 600,
            }}
          >
            True effective tax rate
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-warning-500, #f59e0b)",
            }}
          >
            {calc.effectiveTaxRate}%
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}
          >
            Tax paid relative to your £{Math.round(calc.actualCashProfit).toLocaleString("en-GB")}{" "}
            real cash profit
          </span>
        </div>

        <div className={metricCard}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: 600,
            }}
          >
            Net cash retained
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-success-500, #10b981)",
            }}
          >
            £{Math.round(calc.netCashInPocket).toLocaleString("en-GB")} / yr
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}
          >
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
          borderTop: "1px solid var(--colors-border, #e2e8f0)",
        }}
      >
        <div style={{ maxWidth: "440px" }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Need automated HMRC Self-Assessment & property tax tracking?
          </span>
          <p style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)", margin: 0 }}>
            Flump automatically models Section 24 adjustments, joint spousal splits, and Payments on
            Account.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText} <FiArrowRight aria-hidden="true" style={{ marginLeft: "6px" }} />
        </Button>
      </div>
    </div>
  );
};

export default Section24Calculator;
