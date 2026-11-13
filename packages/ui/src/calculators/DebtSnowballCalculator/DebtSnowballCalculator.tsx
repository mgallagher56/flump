import {
  compareAvalancheAndSnowball,
  type DebtItem,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../components/forms/Button.js";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  cardStyle,
  gridStyle,
  inputGroupStyle,
  resultsBoxStyle,
  textInputStyle,
} from "./DebtSnowballCalculator.styles.js";

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

  const headline = comparison.avalanche.payoffAchievable
    ? `Debt-free by ${comparison.avalanche.debtFreeDate}, total interest £${Math.round(
        comparison.avalanche.totalInterest,
      ).toLocaleString("en-GB")}`
    : "These payments will not clear the debt";

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
      window.location.href = "/signup";
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
              color: "var(--colors-text-primary)",
            }}
          >
            Debt payoff: snowball vs avalanche calculator
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--colors-text-muted)", margin: 0 }}>
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
                    border: "1px solid var(--colors-border-input)",
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
              style={{ width: "100%", accentColor: "var(--colors-primary)" }}
              type="range"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "var(--colors-status-warning-bg)",
                color: "var(--colors-status-warning-text)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ⚡ Avalanche strategy (highest APR first)
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--colors-status-positive-solid)",
                marginTop: "4px",
              }}
            >
              Debt free: {comparison.avalanche.debtFreeDate}
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
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
              backgroundColor: "surface.card",
              borderRadius: "8px",
              border: "1px solid var(--colors-border)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
              Total interest saved vs minimum payments:
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "var(--colors-status-danger-solid)",
                marginTop: "2px",
              }}
            >
              £{Math.round(comparison.interestSavedAvalancheVsMin).toLocaleString()}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "var(--colors-status-info-bg)",
                color: "var(--colors-status-info-text)",
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
                color: "var(--colors-text-muted)",
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
