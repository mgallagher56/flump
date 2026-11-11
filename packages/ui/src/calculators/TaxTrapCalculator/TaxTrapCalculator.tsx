import { calculateTaxTrapRelief, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { Button } from "../../components/forms/Button.js";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  cardStyle,
  inputGroupStyle,
  metricCard,
  metricsGridStyle,
  sliderStyle,
} from "./TaxTrapCalculator.styles.js";

export interface TaxTrapCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const TaxTrapCalculator: FC<TaxTrapCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Save scenario and continue free →",
}) => {
  const [grossIncome, setGrossIncome] = useState<number>(115000);
  const [salarySacrifice, setSalarySacrifice] = useState<number>(10000);

  const analysis = useMemo(() => {
    return calculateTaxTrapRelief(grossIncome);
  }, [grossIncome]);

  const allowanceReclaimed = Math.min(
    analysis.lostPersonalAllowance,
    Math.round(salarySacrifice / 2),
  );

  const inTrapSacrifice = Math.min(analysis.excessAbove100k, salarySacrifice);
  const aboveTrapSacrifice = Math.max(0, salarySacrifice - analysis.excessAbove100k);
  const totalTaxSaved = Math.round(inTrapSacrifice * 0.62 + aboveTrapSacrifice * 0.42);

  const maxSacrifice = Math.min(60000, Math.max(0, grossIncome - 20000));
  const isTrapZone = grossIncome > 100000;
  const netIncomeAfterSacrifice = Math.max(0, grossIncome - salarySacrifice);
  const childcareEligible = netIncomeAfterSacrifice <= 100000;

  const headline = `Tax and NI saved £${totalTaxSaved.toLocaleString("en-GB")}`;

  const handleSave = () => {
    const payload = {
      annualIncome: grossIncome,
      initialCashSavings: 1000,
      mortgageBalance: 250000,
      inferredModules: ["tax", "pension", "forecast"],
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
    <div className={cardStyle} data-testid="tax-trap-calculator-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "var(--colors-primary)",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            UK 2026/27 Tax Engine
          </span>
          {isTrapZone && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 10px",
                borderRadius: "9999px",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "var(--colors-status-danger-solid)",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <FiAlertTriangle size={13} /> 60% trap active
            </span>
          )}
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--colors-text-primary)",
            margin: "0 0 4px 0",
          }}
        >
          Interactive £100k–£125k tax trap modeller
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--colors-text-muted)", margin: 0 }}>
          Slide your income and test how salary sacrifice or SIPP contributions reclaim your
          personal allowance and unlock tax-free childcare.
        </p>
      </div>

      <div className={inputGroupStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="gross-income-input" style={{ fontSize: "14px", fontWeight: 600 }}>
            Total gross UK income
          </label>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                position: "absolute",
                left: "8px",
                fontSize: "13px",
                color: "var(--colors-text-muted)",
              }}
            >
              £
            </span>
            <input
              id="gross-income-input"
              type="number"
              min={0}
              step={500}
              value={grossIncome}
              onChange={(e) => setGrossIncome(Number(e.target.value) || 0)}
              style={{
                width: "110px",
                padding: "4px 8px 4px 20px",
                fontSize: "15px",
                fontWeight: 700,
                textAlign: "right",
                color: "var(--colors-primary)",
                borderRadius: "8px",
                border: "1px solid var(--colors-border-input)",
                backgroundColor: "var(--colors-surface)",
              }}
            />
          </div>
        </div>
        <input
          id="gross-income-slider"
          aria-label="Total gross UK income slider"
          className={sliderStyle}
          max={150000}
          min={90000}
          step={500}
          type="range"
          value={grossIncome}
          onChange={(e) => setGrossIncome(Number(e.target.value))}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--colors-text-muted)",
          }}
        >
          <span>£90k (40% Higher Rate)</span>
          <span>£100k (Trap Starts)</span>
          <span>£125,140 (Zero Allowance)</span>
          <span>£150k</span>
        </div>
      </div>

      <div className={inputGroupStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="sacrifice-input" style={{ fontSize: "14px", fontWeight: 600 }}>
            Annual pension salary sacrifice / SIPP contribution
          </label>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                position: "absolute",
                left: "8px",
                fontSize: "13px",
                color: "var(--colors-text-muted)",
              }}
            >
              £
            </span>
            <input
              id="sacrifice-input"
              type="number"
              min={0}
              max={maxSacrifice}
              step={500}
              value={salarySacrifice}
              onChange={(e) => setSalarySacrifice(Number(e.target.value) || 0)}
              style={{
                width: "110px",
                padding: "4px 8px 4px 20px",
                fontSize: "15px",
                fontWeight: 700,
                textAlign: "right",
                color: "var(--colors-status-positive-solid)",
                borderRadius: "8px",
                border: "1px solid var(--colors-border-input)",
                backgroundColor: "var(--colors-surface)",
              }}
            />
          </div>
        </div>
        <input
          id="sacrifice-slider"
          aria-label="Annual pension salary sacrifice slider"
          className={sliderStyle}
          max={maxSacrifice}
          min={0}
          step={500}
          type="range"
          value={salarySacrifice}
          onChange={(e) => setSalarySacrifice(Number(e.target.value))}
        />
      </div>

      <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Effective Marginal Rate
          </span>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color:
                isTrapZone && salarySacrifice < analysis.excessAbove100k
                  ? "var(--colors-status-danger-solid)"
                  : "var(--colors-status-positive-solid)",
            }}
          >
            {isTrapZone && salarySacrifice < analysis.excessAbove100k ? "62.0%" : "42.0%"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
            40% Income Tax + 20% Taper + 2% NI
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Tax and NI saved
          </span>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--colors-status-positive-solid)",
            }}
          >
            £{totalTaxSaved.toLocaleString()}
          </span>
          <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
            Guaranteed immediate relief
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Personal allowance reclaimed
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--colors-primary)" }}>
            £{allowanceReclaimed.toLocaleString()}
          </span>
          <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
            of £{analysis.lostPersonalAllowance.toLocaleString()} lost allowance
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          borderRadius: "12px",
          backgroundColor: childcareEligible
            ? "rgba(16, 185, 129, 0.08)"
            : "rgba(239, 68, 68, 0.08)",
          border: `1px solid ${childcareEligible ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
          marginBottom: "24px",
        }}
      >
        {childcareEligible ? (
          <FiCheckCircle color="var(--colors-status-positive-solid)" size={18} />
        ) : (
          <FiAlertTriangle color="var(--colors-status-danger-solid)" size={18} />
        )}
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
          {childcareEligible
            ? "Eligible for 15–30 Hours Free Childcare & Tax-Free Childcare (Adjusted Net Income ≤ £100k)"
            : "Childcare Cliff Edge Triggered: Adjusted net income exceeds £100,000. All funded hours revoked."}
        </span>
      </div>

      <Button
        size="md"
        style={{ width: "100%", justifyContent: "center" }}
        variant="primary"
        onClick={handleSave}
      >
        {ctaText} <FiArrowRight style={{ marginLeft: "8px" }} />
      </Button>
    </div>
  );
};

export default TaxTrapCalculator;
