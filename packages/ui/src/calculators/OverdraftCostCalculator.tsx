import { calculateOverdraftCost, persistOnboardingSeed } from "@repo/common";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { css } from "../../styled-system/css/index.js";
import { Button } from "../components/forms/Button.js";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  boxShadow: "sm",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
});

const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "15px",
});

const resultsBoxStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
});

export interface OverdraftCostCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const OverdraftCostCalculator: FC<OverdraftCostCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Eliminate Your Overdraft with Flump →",
}) => {
  const [balance, setBalance] = useState<number>(1200);
  const [earRate, setEarRate] = useState<number>(39.9);

  const cost = useMemo(() => {
    return calculateOverdraftCost(balance, earRate);
  }, [balance, earRate]);

  const handleSave = () => {
    const payload = {
      mode: "DEBT",
      totalUnsecuredDebt: balance,
      inferredModules: ["accounts", "debt", "budget"],
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
    <div className={cardStyle} data-testid="overdraft-cost-tool">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: "0 0 4px 0",
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Overdraft interest cost calculator
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--colors-text-muted, #64748b)",
              margin: 0,
            }}
          >
            UK banks charge effective rates approaching 40% EAR on arranged overdrafts. Calculate
            your stealth annual fee.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Average Overdraft Balance Used (£)
            </span>
            <input
              aria-label="Overdraft Balance"
              className={textInputStyle}
              min={50}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Bank EAR Rate (%) (UK standard is ~39.9%)
            </span>
            <input
              aria-label="Bank EAR Rate"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={earRate}
              onChange={(e) => setEarRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Annual bank interest cost
            </span>
            <div
              style={{
                fontSize: "30px",
                fontWeight: "800",
                color: "#ef4444",
                marginTop: "4px",
              }}
            >
              £{Math.round(cost.annualPoundCost).toLocaleString()} / year
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted, #64748b)",
                margin: "4px 0 0 0",
              }}
            >
              Directly debited as ~£{cost.monthlyPoundCost.toFixed(2)}/month from your regular
              checking balance.
            </p>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "surface",
              borderRadius: "10px",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>
              💡 Why Overdrafts Are Dangerous
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted, #64748b)",
                marginTop: "4px",
                marginBottom: 0,
              }}
            >
              Because there is no fixed repayment date or separate statement, persistent overdrafts
              act as an indefinite 40% APR revolving charge. Clearing a £1,200 overdraft delivers an
              immediate guaranteed 39.9% tax-free return on your money!
            </p>
          </div>

          <Button onClick={handleSave} size="md" style={{ width: "100%" }}>
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OverdraftCostCalculator;
