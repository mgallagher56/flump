import type { AvalancheVsSnowballComparison } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaBolt, FaSlidersH, FaSnowflake } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface PayoffStrategySwitcherProps {
  comparison: AvalancheVsSnowballComparison;
  selectedStrategy: "avalanche" | "snowball";
  onSelectStrategy: (strategy: "avalanche" | "snowball") => void;
  extraPayment: number;
  onChangeExtraPayment: (amount: number) => void;
  budgetSurplus?: number;
}

const cardStyle = css({
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

const headerRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
});

const pillGroupStyle = css({
  display: "flex",
  backgroundColor: "muted",
  padding: "4px",
  borderRadius: "lg",
  gap: "4px",
});

const pillButtonStyle = (active: boolean) =>
  css({
    padding: "8px 16px",
    borderRadius: "md",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: active ? "card" : "transparent",
    color: active ? "primary" : "text.muted",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
    border: "none",
    transition: "all 0.15s ease",
  });

const sliderContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  backgroundColor: "rgba(99, 99, 241, 0.05)",
  border: "1px solid",
  borderColor: "rgba(99, 99, 241, 0.2)",
  padding: "18px 20px",
  borderRadius: "xl",
});

const sliderHeaderStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const sliderInputStyle = css({
  width: "100%",
  accentColor: "token(colors.primary)",
  cursor: "pointer",
});

const comparisonGridStyle = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    md: "repeat(3, 1fr)",
  },
  gap: "16px",
});

const modeCardStyle = (active: boolean) =>
  css({
    padding: "16px",
    borderRadius: "lg",
    border: "2px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "rgba(99, 99, 241, 0.04)" : "card",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

export const PayoffStrategySwitcher: FC<PayoffStrategySwitcherProps> = ({
  comparison,
  selectedStrategy,
  onSelectStrategy,
  extraPayment,
  onChangeExtraPayment,
  budgetSurplus = 0,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const monthsSaved = Math.max(0, comparison.minimumOnly.months - activeResult.months);
  const interestSaved = Math.max(
    0,
    comparison.minimumOnly.totalInterest - activeResult.totalInterest,
  );

  return (
    <FLPCard>
      <div className={cardStyle}>
        <div className={headerRowStyle}>
          <div>
            <FLPHeading as="h3" size="xl">
              Payoff Strategy: Avalanche vs. Snowball
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Choose the mathematical engine that matches your financial psychology.
            </FLPText>
          </div>

          <div className={pillGroupStyle}>
            <button
              aria-label="Select Avalanche strategy"
              className={pillButtonStyle(selectedStrategy === "avalanche")}
              type="button"
              onClick={() => onSelectStrategy("avalanche")}
            >
              <FaBolt color="#f59e0b" /> Avalanche (Highest APR)
            </button>
            <button
              aria-label="Select Snowball strategy"
              className={pillButtonStyle(selectedStrategy === "snowball")}
              type="button"
              onClick={() => onSelectStrategy("snowball")}
            >
              <FaSnowflake color="#3b82f6" /> Snowball (Smallest Balance)
            </button>
          </div>
        </div>

        {/* The "Extra £50" Interactive Input & Slider */}
        <div className={sliderContainerStyle}>
          <div className={sliderHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaSlidersH color="var(--colors-primary)" />
              <label htmlFor="debt-extra-input" style={{ fontSize: "14px", fontWeight: "bold" }}>
                Monthly debt overpayment
              </label>
            </div>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "13px",
                  color: "var(--colors-text-muted)",
                }}
              >
                +£
              </span>
              <input
                id="debt-extra-input"
                type="number"
                min="0"
                step="10"
                value={extraPayment}
                onChange={(e) => onChangeExtraPayment(Number(e.target.value) || 0)}
                style={{
                  width: "90px",
                  padding: "4px 8px 4px 26px",
                  fontSize: "14px",
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
            id="debt-extra-slider"
            aria-label="Extra monthly debt overpayment slider"
            className={sliderInputStyle}
            max="600"
            min="0"
            step="10"
            type="range"
            value={extraPayment}
            onChange={(e) => onChangeExtraPayment(Number(e.target.value))}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <FLPText color="text.muted" fontSize="xs">
              {budgetSurplus > 0
                ? `Wired to budget surplus: ${formatCurrency(budgetSurplus)}/mo available`
                : "Allocate disposable income from budget"}
            </FLPText>
            {budgetSurplus > 0 && extraPayment !== Math.min(budgetSurplus, 500) && (
              <FLPButton
                size="sm"
                variant="outline"
                onClick={() => onChangeExtraPayment(Math.min(Math.round(budgetSurplus), 500))}
              >
                Match surplus ({formatCurrency(budgetSurplus)})
              </FLPButton>
            )}
          </div>

          <div
            style={{
              backgroundColor: "rgba(99, 99, 241, 0.08)",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px dashed rgba(99, 99, 241, 0.3)",
            }}
          >
            <FLPText color="text.primary" fontSize="sm" fontWeight="bold">
              Impact: Put an extra {formatCurrency(extraPayment)}/mo toward debt →{" "}
              {monthsSaved > 0
                ? `Become debt-free ${monthsSaved} months sooner and save ${formatCurrency(interestSaved)} in interest.`
                : "Increase overpayment to shave months off your timeline."}
            </FLPText>
          </div>
        </div>

        {/* Strategy Comparison Cards */}
        <div className={comparisonGridStyle}>
          {/* 1. Avalanche Mode */}
          <div className={modeCardStyle(selectedStrategy === "avalanche")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FLPText fontSize="md" fontWeight="bold">
                Avalanche mode
              </FLPText>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                Mathematically optimal
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Targets highest APR debts first. Maximizes pure interest savings across your entire
              liability portfolio.
            </FLPText>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong> {comparison.avalanche.debtFreeDate} (
                {comparison.avalanche.months} mos)
              </FLPText>
              <FLPText fontSize="sm">
                <strong>Total Interest:</strong>{" "}
                {formatCurrency(comparison.avalanche.totalInterest)}
              </FLPText>
              <FLPText color="green.600" fontSize="xs">
                Saves {formatCurrency(comparison.interestSavedAvalancheVsMin)} vs minimum payments
              </FLPText>
            </div>
          </div>

          {/* 2. Snowball Mode */}
          <div className={modeCardStyle(selectedStrategy === "snowball")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FLPText fontSize="md" fontWeight="bold">
                ❄️ Snowball Mode
              </FLPText>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                Psychologically Optimal
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Targets smallest balances first to generate immediate momentum and knock out
              individual accounts fast.
            </FLPText>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong> {comparison.snowball.debtFreeDate} (
                {comparison.snowball.months} mos)
              </FLPText>
              <FLPText fontSize="sm">
                <strong>Total Interest:</strong> {formatCurrency(comparison.snowball.totalInterest)}
              </FLPText>
              <FLPText color="blue.600" fontSize="xs">
                🏆 Quick Win: {comparison.snowballFirstWinDescription}
              </FLPText>
            </div>
          </div>

          {/* 3. Minimum Payments Baseline */}
          <div className={modeCardStyle(false)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FLPText color="text.muted" fontSize="md" fontWeight="bold">
                🐌 Minimum Only
              </FLPText>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                High Cost Trap
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Making only mandatory minimums causes compounding interest to drag out your
              liabilities for years.
            </FLPText>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong> {comparison.minimumOnly.debtFreeDate} (
                {comparison.minimumOnly.months} mos)
              </FLPText>
              <FLPText color="red.600" fontSize="sm">
                <strong>Total Interest:</strong>{" "}
                {formatCurrency(comparison.minimumOnly.totalInterest)}
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                Costly baseline to avoid
              </FLPText>
            </div>
          </div>
        </div>
      </div>
    </FLPCard>
  );
};

export default PayoffStrategySwitcher;
