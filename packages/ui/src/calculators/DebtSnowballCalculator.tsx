import {
  compareAvalancheAndSnowball,
  type DebtItem,
  persistOnboardingSeed,
} from "@flump/finance-engine";
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

export interface DebtSnowballCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const DebtSnowballCalculator: FC<DebtSnowballCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track live in Flump free →",
}) => {
  const [cardBalance, setCardBalance] = useState<number>(3500);
  const [cardApr, setCardApr] = useState<number>(24.9);
  const [cardMin, setCardMin] = useState<number>(90);

  const [loanBalance, setLoanBalance] = useState<number>(5000);
  const [loanApr, setLoanApr] = useState<number>(8.5);
  const [loanMin, setLoanMin] = useState<number>(140);

  const [extraPayment, setExtraPayment] = useState<number>(75);

  const debts = useMemo<DebtItem[]>(() => {
    return [
      {
        id: "d1",
        name: "Credit Card",
        balance: cardBalance,
        apr: cardApr,
        minimumPayment: cardMin,
        type: "credit_card",
      },
      {
        id: "d2",
        name: "Personal Loan",
        balance: loanBalance,
        apr: loanApr,
        minimumPayment: loanMin,
        type: "loan",
      },
    ];
  }, [cardBalance, cardApr, cardMin, loanBalance, loanApr, loanMin]);

  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  const handleSave = () => {
    const totalDebt = cardBalance + loanBalance;
    const payload = {
      mode: "DEBT",
      totalUnsecuredDebt: totalDebt,
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
    <div className={cardStyle} data-testid="debt-snowball-tool">
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
            Debt payoff: snowball vs avalanche calculator
          </h2>
          <p
            style={{ fontSize: "0.875rem", color: "var(--colors-text-muted, #64748b)", margin: 0 }}
          >
            Model exact interest savings and exit dates between mathematically optimal (avalanche)
            and psychological momentum (snowball).
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(99,99,241,0.05)",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              Liability 1: Credit card
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>Balance (£)</span>
                <input
                  aria-label="Credit card balance"
                  className={textInputStyle}
                  type="number"
                  value={cardBalance}
                  onChange={(e) => setCardBalance(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>APR (%)</span>
                <input
                  aria-label="Credit card APR"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={cardApr}
                  onChange={(e) => setCardApr(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>Min / mo (£)</span>
                <input
                  aria-label="Credit card minimum payment"
                  className={textInputStyle}
                  type="number"
                  value={cardMin}
                  onChange={(e) => setCardMin(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(99,99,241,0.05)",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              Liability 2: Personal loan
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>Balance (£)</span>
                <input
                  aria-label="Personal loan balance"
                  className={textInputStyle}
                  type="number"
                  value={loanBalance}
                  onChange={(e) => setLoanBalance(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>APR (%)</span>
                <input
                  aria-label="Personal loan APR"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={loanApr}
                  onChange={(e) => setLoanApr(Number(e.target.value) || 0)}
                />
              </div>
              <div className={inputGroupStyle}>
                <span style={{ fontSize: "12px" }}>Min / mo (£)</span>
                <input
                  aria-label="Personal loan minimum payment"
                  className={textInputStyle}
                  type="number"
                  value={loanMin}
                  onChange={(e) => setLoanMin(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className={inputGroupStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="extra-payment-input" style={{ fontSize: "14px", fontWeight: "bold" }}>
                Monthly overpayment surplus
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
                  +£
                </span>
                <input
                  id="extra-payment-input"
                  type="number"
                  min={0}
                  step={10}
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
                  style={{
                    width: "80px",
                    padding: "3px 6px 3px 24px",
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
              id="extra-payment-slider"
              aria-label="Monthly overpayment surplus slider"
              max={500}
              min={0}
              step={10}
              style={{ width: "100%", accentColor: "var(--colors-primary, #6366f1)" }}
              type="range"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#fef3c7",
                color: "#b45309",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ⚡ Avalanche strategy (highest APR first)
            </span>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981", marginTop: "4px" }}
            >
              Debt free: {comparison.avalanche.debtFreeDate}
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted, #64748b)",
                margin: "4px 0 0 0",
              }}
            >
              {comparison.avalanche.months} months total • Shaves{" "}
              {comparison.monthsShavedAvalancheVsMin} months off minimum payments
            </p>
          </div>

          <div
            style={{
              padding: "12px",
              backgroundColor: "surface",
              borderRadius: "8px",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
              Total interest saved vs minimum payments:
            </span>
            <div
              style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444", marginTop: "2px" }}
            >
              £{Math.round(comparison.interestSavedAvalancheVsMin).toLocaleString()}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "#dbeafe",
                color: "#1e40af",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ❄️ Snowball strategy (smallest balance first)
            </span>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: "4px" }}>
              {comparison.snowballFirstWinDescription}
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted, #64748b)",
                margin: "4px 0 0 0",
              }}
            >
              Full payoff in {comparison.snowball.months} months (Total interest: £
              {Math.round(comparison.snowball.totalInterest).toLocaleString()})
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

export default DebtSnowballCalculator;
