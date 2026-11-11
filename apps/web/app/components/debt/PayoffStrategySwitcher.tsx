import type { AvalancheVsSnowballComparison } from "@flump/finance-engine";
import { VisuallyHidden } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useId } from "react";
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
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  height: "100%",
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
  backgroundColor: "surface.sunken",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "4px",
  borderRadius: "lg",
  gap: "4px",
});

const pillButtonStyle = (active: boolean) =>
  css({
    padding: "8px 16px",
    borderRadius: "md",
    fontSize: "13px",
    fontWeight: "semibold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: active ? "card" : "transparent",
    color: active ? "text.primary" : "text.muted",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
    border: "1px solid",
    borderColor: active ? "border.subtle" : "transparent",
    transition: "all 0.15s ease",
    _hover: active ? {} : { color: "text.primary" },
  });

const sliderContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  backgroundColor: "surface.sunken",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "16px",
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
  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
  gap: "12px",
});

const modeCardStyle = (active: boolean, clickable: boolean = false) =>
  css({
    padding: "16px",
    borderRadius: "xl",
    borderWidth: active ? "2px" : "1px",
    borderStyle: "solid",
    borderColor: active ? "primary" : "border.subtle",
    backgroundColor: active ? "rgba(99, 99, 241, 0.06)" : "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "all 0.15s ease",
    cursor: clickable ? "pointer" : "default",
    "&:has(:focus-visible)": {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    _hover: clickable && !active ? { borderColor: "border.strong" } : {},
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
  const groupName = useId();

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
        <div aria-label="Payoff strategy" className={comparisonGridStyle} role="radiogroup">
          {/* 1. Avalanche Mode */}
          <label
            className={modeCardStyle(selectedStrategy === "avalanche" && extraPayment > 0, true)}
          >
            <VisuallyHidden>
              <input
                aria-label="Select Avalanche strategy"
                checked={selectedStrategy === "avalanche" && extraPayment > 0}
                name={groupName}
                type="radio"
                onChange={() => {
                  onSelectStrategy("avalanche");
                  if (extraPayment === 0) onChangeExtraPayment(50);
                }}
              />
            </VisuallyHidden>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FaBolt color="#f59e0b" size={14} />
                <FLPText fontSize="md" fontWeight="bold">
                  Avalanche (Highest APR)
                </FLPText>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                Mathematically optimal
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Targets highest APR debts first. Maximizes pure interest savings across your entire
              liability portfolio.
            </FLPText>
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {comparison.avalanche.debtFreeDate} ({comparison.avalanche.months} mos)
                </span>
              </FLPText>
              <FLPText fontSize="sm">
                <strong>Total Interest:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {formatCurrency(comparison.avalanche.totalInterest)}
                </span>
              </FLPText>
              <FLPText color="green.600" fontSize="xs" fontWeight="semibold">
                Saves{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {formatCurrency(comparison.interestSavedAvalancheVsMin)}
                </span>{" "}
                vs minimum payments
              </FLPText>
            </div>
          </label>

          {/* 2. Snowball Mode */}
          <label
            className={modeCardStyle(selectedStrategy === "snowball" && extraPayment > 0, true)}
          >
            <VisuallyHidden>
              <input
                aria-label="Select Snowball strategy"
                checked={selectedStrategy === "snowball" && extraPayment > 0}
                name={groupName}
                type="radio"
                onChange={() => {
                  onSelectStrategy("snowball");
                  if (extraPayment === 0) onChangeExtraPayment(50);
                }}
              />
            </VisuallyHidden>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FaSnowflake color="#3b82f6" size={14} />
                <FLPText fontSize="md" fontWeight="bold">
                  Snowball (Smallest Balance)
                </FLPText>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                Psychologically optimal
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Targets smallest balances first to generate immediate momentum and knock out
              individual accounts fast.
            </FLPText>
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {comparison.snowball.debtFreeDate} ({comparison.snowball.months} mos)
                </span>
              </FLPText>
              <FLPText fontSize="sm">
                <strong>Total Interest:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {formatCurrency(comparison.snowball.totalInterest)}
                </span>
              </FLPText>
              <FLPText color="text.primary" fontSize="xs" fontWeight="semibold">
                🏆 Quick Win: {comparison.snowballFirstWinDescription}
              </FLPText>
            </div>
          </label>

          {/* 3. Minimum Payments Baseline */}
          <label className={modeCardStyle(extraPayment === 0, true)}>
            <VisuallyHidden>
              <input
                aria-label="Select Minimum Only strategy"
                checked={extraPayment === 0}
                name={groupName}
                type="radio"
                onChange={() => onChangeExtraPayment(0)}
              />
            </VisuallyHidden>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <FLPText color="text.muted" fontSize="md" fontWeight="bold">
                🐌 Minimum Only
              </FLPText>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                High cost baseline
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              Making only mandatory minimums causes compounding interest to drag out your
              liabilities for years.
            </FLPText>
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <FLPText fontSize="sm">
                <strong>Payoff Horizon:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {comparison.minimumOnly.debtFreeDate} ({comparison.minimumOnly.months} mos)
                </span>
              </FLPText>
              <FLPText color="red.500" fontSize="sm">
                <strong>Total Interest:</strong>{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {formatCurrency(comparison.minimumOnly.totalInterest)}
                </span>
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                Costly baseline to avoid
              </FLPText>
            </div>
          </label>
        </div>
      </div>
    </FLPCard>
  );
};

export default PayoffStrategySwitcher;
