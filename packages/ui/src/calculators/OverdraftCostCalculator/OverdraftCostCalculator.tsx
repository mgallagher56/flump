import { calculateOverdraftCost, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { css } from "../../../styled-system/css/index.js";
import { Button } from "../../components/forms/Button.js";

import { LiveRegion } from "../../primitives/LiveRegion";
import {
  cardStyle,
  gridStyle,
  inputGroupStyle,
  resultsBoxStyle,
  textInputStyle,
} from "./OverdraftCostCalculator.styles.js";

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

  const headline = `Overdraft costs £${Math.round(cost.annualPoundCost).toLocaleString(
    "en-GB",
  )} a year in interest`;

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
              color: "var(--colors-text-primary)",
            }}
          >
            Overdraft interest cost calculator
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--colors-text-muted)",
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
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "var(--colors-status-danger-bg)",
                color: "var(--colors-status-danger-text)",
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
                color: "var(--colors-status-danger-solid)",
                marginTop: "4px",
              }}
            >
              £{Math.round(cost.annualPoundCost).toLocaleString()} / year
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
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
              backgroundColor: "surface.card",
              borderRadius: "10px",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>
              💡 Why Overdrafts Are Dangerous
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
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
