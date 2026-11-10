import { calculateZeroPercentCliff, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { css } from "../../../styled-system/css/index.js";
import { Button } from "../../components/forms/Button.js";

import {
  cardStyle,
  gridStyle,
  inputGroupStyle,
  resultsBoxStyle,
  textInputStyle,
} from "./ZeroPercentCliffCalculator.styles.js";

export interface ZeroPercentCliffCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const ZeroPercentCliffCalculator: FC<ZeroPercentCliffCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track 0% expiry dates in Flump free →",
}) => {
  const [balance, setBalance] = useState<number>(3600);
  const [months, setMonths] = useState<number>(18);
  const [revertApr, setRevertApr] = useState<number>(24.9);

  const cliff = useMemo(() => {
    return calculateZeroPercentCliff(balance, months, revertApr);
  }, [balance, months, revertApr]);

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
    <div className={cardStyle} data-testid="zero-percent-cliff-tool">
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
            0% balance transfer promotional expiry calculator
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--colors-text-muted)",
              margin: 0,
            }}
          >
            Calculate the exact monthly repayment needed to clear your card before the 0%
            promotional window expires.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Current 0% card balance (£)
            </span>
            <input
              aria-label="0% card balance"
              className={textInputStyle}
              min={100}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Months remaining on 0% offer
            </span>
            <input
              aria-label="Months remaining on 0% offer"
              className={textInputStyle}
              max={48}
              min={1}
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Revert APR after offer ends (%)
            </span>
            <input
              aria-label="Revert APR"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={revertApr}
              onChange={(e) => setRevertApr(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "var(--colors-status-positive-bg)",
                color: "var(--colors-status-positive-text)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Target monthly payment
            </span>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "var(--colors-status-positive-solid)",
                marginTop: "4px",
              }}
            >
              £{Math.round(cliff.requiredMonthlyPayment)} / month
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Clears the entire £{balance.toLocaleString()} balance across {months} months without
              paying £1 in interest.
            </p>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "var(--colors-status-danger-bg)",
              borderRadius: "10px",
              border: "1px solid var(--colors-status-danger-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--colors-status-danger-text)",
              }}
            >
              <FaExclamationTriangle size={16} />
              <strong style={{ fontSize: "13px" }}>Revert APR alert</strong>
            </div>
            <p
              style={{
                color: "var(--colors-status-danger-text)",
                fontSize: "12px",
                margin: "4px 0 0 0",
              }}
            >
              If you pay only minimums, you will reach the {revertApr}% revert date with ~£
              {Math.round(cliff.balanceRemainingIfMinimum).toLocaleString()} unpaid, costing £
              {Math.round(cliff.penaltyInterestFirstYearIfUnpaid).toLocaleString()} in first-year
              interest.
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

export default ZeroPercentCliffCalculator;
