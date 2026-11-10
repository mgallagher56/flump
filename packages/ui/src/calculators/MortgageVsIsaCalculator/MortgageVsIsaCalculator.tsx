import { persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiArrowRight, FiHome, FiTrendingUp } from "react-icons/fi";
import { Button } from "../../components/forms/Button.js";
import {
  cardStyle,
  inputGridStyle,
  inputGroupStyle,
  metricCard,
  metricsGridStyle,
  sliderStyle,
} from "./MortgageVsIsaCalculator.styles.js";

export interface MortgageVsIsaCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const MortgageVsIsaCalculator: FC<MortgageVsIsaCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Model your mortgage in Flump free →",
}) => {
  const [mortgageBalance, setMortgageBalance] = useState<number>(240000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingYears, setRemainingYears] = useState<number>(20);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(350);
  const [isaExpectedReturn, setIsaExpectedReturn] = useState<number>(7.0);

  const simulation = useMemo(() => {
    const months = remainingYears * 12;
    const monthlyRate = interestRate / 100 / 12;
    const monthlyIsaRate = isaExpectedReturn / 100 / 12;

    // Standard mortgage monthly payment
    const standardPayment =
      monthlyRate > 0
        ? (mortgageBalance * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1)
        : mortgageBalance / months;

    // 1. Overpayment amortization
    let bal = mortgageBalance;
    let totalInterestOverpay = 0;
    let monthsToZero = 0;
    for (let m = 1; m <= months; m++) {
      if (bal <= 0) break;
      const interest = bal * monthlyRate;
      totalInterestOverpay += interest;
      const principal = Math.min(bal, standardPayment + monthlyContribution - interest);
      bal -= principal;
      monthsToZero = m;
    }

    // Standard total interest without overpayment
    let standardBal = mortgageBalance;
    let totalStandardInterest = 0;
    for (let m = 1; m <= months; m++) {
      if (standardBal <= 0) break;
      const interest = standardBal * monthlyRate;
      totalStandardInterest += interest;
      const principal = Math.min(standardBal, standardPayment - interest);
      standardBal -= principal;
    }

    const interestSaved = Math.max(0, totalStandardInterest - totalInterestOverpay);
    const monthsShaved = Math.max(0, months - monthsToZero);
    const yearsShaved = (monthsShaved / 12).toFixed(1);

    // 2. ISA compound investment pot
    let isaPot = 0;
    for (let m = 1; m <= months; m++) {
      isaPot = (isaPot + monthlyContribution) * (1 + monthlyIsaRate);
    }
    const totalIsaContributed = monthlyContribution * months;
    const isaGrowth = Math.max(0, isaPot - totalIsaContributed);

    // Net advantage of ISA over mortgage interest saved
    const isaNetAdvantage = isaPot - (totalIsaContributed + interestSaved);

    return {
      standardPayment,
      interestSaved,
      yearsShaved,
      isaPot,
      isaGrowth,
      isaNetAdvantage,
    };
  }, [mortgageBalance, interestRate, remainingYears, monthlyContribution, isaExpectedReturn]);

  const handleSave = () => {
    const payload = {
      annualIncome: 75000,
      monthlyContribution,
      mortgageBalance,
      inferredModules: ["mortgage", "accounts", "forecast"],
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
    <div className={cardStyle} data-testid="mortgage-vs-isa-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              color: "var(--colors-status-warning-solid)",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            UK Mortgage & Wealth Engine
          </span>
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--colors-text-primary))",
            margin: "0 0 4px 0",
          }}
        >
          Mortgage overpayment vs stocks and shares ISA comparator
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--colors-text-muted))", margin: 0 }}>
          Mathematically compare the guaranteed interest savings of mortgage overpayments against
          the compound returns of a tax-sheltered UK Stocks & Shares ISA.
        </p>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="mortgage-bal" style={{ fontSize: "13px", fontWeight: 600 }}>
              Mortgage balance
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
                id="mortgage-bal"
                type="number"
                min={0}
                step={5000}
                value={mortgageBalance}
                onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
                style={{
                  width: "100px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "var(--colors-status-warning-solid)",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-bal-slider"
            aria-label="Mortgage balance slider"
            max={750000}
            min={50000}
            onChange={(e) => setMortgageBalance(Number(e.target.value))}
            step={5000}
            type="range"
            value={mortgageBalance}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="mortgage-rate" style={{ fontSize: "13px", fontWeight: 600 }}>
              Mortgage interest rate
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                id="mortgage-rate"
                type="number"
                min={0}
                max={20}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                style={{
                  width: "70px",
                  padding: "3px 18px 3px 6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "var(--colors-status-warning-solid)",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                %
              </span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-rate-slider"
            aria-label="Mortgage interest rate slider"
            max={8.0}
            min={1.5}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            step={0.1}
            type="range"
            value={interestRate}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="monthly-extra" style={{ fontSize: "13px", fontWeight: 600 }}>
              Monthly extra cash
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
                id="monthly-extra"
                type="number"
                min={0}
                step={25}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                style={{
                  width: "80px",
                  padding: "3px 6px 3px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "var(--colors-primary)",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
              <span
                style={{ fontSize: "12px", color: "var(--colors-text-muted)", marginLeft: "4px" }}
              >
                /mo
              </span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="monthly-extra-slider"
            aria-label="Monthly extra cash slider"
            max={1500}
            min={50}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            step={25}
            type="range"
            value={monthlyContribution}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="isa-return" style={{ fontSize: "13px", fontWeight: 600 }}>
              Expected Stocks and Shares ISA return
            </label>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                id="isa-return"
                type="number"
                min={0}
                max={25}
                step={0.25}
                value={isaExpectedReturn}
                onChange={(e) => setIsaExpectedReturn(Number(e.target.value) || 0)}
                style={{
                  width: "70px",
                  padding: "3px 18px 3px 6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: "var(--colors-status-positive-solid)",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                %
              </span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="isa-return-slider"
            aria-label="Expected Stocks and Shares ISA return slider"
            max={12.0}
            min={3.0}
            onChange={(e) => setIsaExpectedReturn(Number(e.target.value))}
            step={0.25}
            type="range"
            value={isaExpectedReturn}
          />
        </div>
      </div>

      {/* Results */}
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FiHome color="var(--colors-status-warning-solid))" size={14} />
            <span
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted))",
                fontWeight: 600,
              }}
            >
              Mortgage Overpay
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-status-warning-solid))",
            }}
          >
            Save £{Math.round(simulation.interestSaved).toLocaleString("en-GB")}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted))" }}
          >
            Shaves ~{simulation.yearsShaved} years off loan term
          </span>
        </div>

        <div className={metricCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FiTrendingUp color="var(--colors-status-positive-solid))" size={14} />
            <span
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted))",
                fontWeight: 600,
              }}
            >
              Stocks and shares ISA pot
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-status-positive-solid))",
            }}
          >
            £{Math.round(simulation.isaPot).toLocaleString("en-GB")}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted))" }}
          >
            Includes £{Math.round(simulation.isaGrowth).toLocaleString("en-GB")} in tax-free returns
          </span>
        </div>

        <div className={metricCard}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted))",
              fontWeight: 600,
            }}
          >
            ISA net wealth spread
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color:
                simulation.isaNetAdvantage >= 0
                  ? "var(--colors-status-positive-solid))"
                  : "var(--colors-status-danger-solid))",
            }}
          >
            {simulation.isaNetAdvantage >= 0 ? "+" : ""}£
            {Math.round(simulation.isaNetAdvantage).toLocaleString("en-GB")}
          </span>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted))" }}>
            {simulation.isaNetAdvantage >= 0
              ? "Expected net wealth gain from investing"
              : "Overpaying mortgage yields higher return"}
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
          borderTop: "1px solid var(--colors-border))",
        }}
      >
        <div style={{ maxWidth: "440px" }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--colors-text-primary))",
            }}
          >
            Ready to track your mortgage deal expiry & live ISA yields?
          </span>
          <p style={{ fontSize: "12px", color: "var(--colors-text-muted))", margin: 0 }}>
            Flump syncs your live balance and monitors fixed-rate renewal dates automatically.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText} <FiArrowRight aria-hidden="true" style={{ marginLeft: "6px" }} />
        </Button>
      </div>
    </div>
  );
};

export default MortgageVsIsaCalculator;
