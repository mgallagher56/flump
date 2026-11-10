import { SliderField, StatusBadge } from "@repo/ui";
import { css, cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaBolt, FaSnowflake } from "react-icons/fa";
import { strategyCard, strategyContainer } from "./PayoffStrategyControls.styles";

export interface PayoffStrategyControlsProps {
  selectedStrategy: "avalanche" | "snowball";
  onSelectStrategy: (strategy: "avalanche" | "snowball") => void;
  extraPayment: number;
  onChangeExtraPayment: (amount: number) => void;
  interestSaved?: number;
  monthsSaved?: number;
  className?: string;
}

export const PayoffStrategyControls: FC<PayoffStrategyControlsProps> = ({
  selectedStrategy,
  onSelectStrategy,
  extraPayment,
  onChangeExtraPayment,
  interestSaved = 2140,
  monthsSaved = 14,
  className,
}) => {
  return (
    <div className={cx(strategyContainer(), className)}>
      <div>
        <h3
          className={css({
            fontFamily: "display",
            fontSize: "md",
            fontWeight: "bold",
            color: "text.primary",
            margin: "0",
          })}
        >
          Payoff Strategy: Avalanche vs. Snowball
        </h3>
        <p className={css({ fontSize: "xs", color: "text.muted", mt: "2px", mb: "0" })}>
          Choose the mathematical engine that matches your financial psychology.
        </p>
      </div>

      {/* Overpayment Slider */}
      <SliderField
        helperText={
          monthsSaved > 0
            ? `Puts you ${monthsSaved} months ahead of minimum repayments.`
            : "Slide to allocate surplus cash."
        }
        label="Monthly Debt Overpayment"
        max={600}
        min={0}
        step={10}
        unitPrefix="£"
        unitSuffix="/mo"
        value={extraPayment}
        onChange={onChangeExtraPayment}
      />

      {/* Impact Callout */}
      <div
        className={css({
          backgroundColor: "primary.subtle",
          p: "10px 14px",
          borderRadius: "lg",
          borderWidth: "1px",
          borderStyle: "dashed",
          borderColor: "primary.border",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        })}
      >
        <span className={css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" })}>
          Total Projected Interest Saved
        </span>
        <StatusBadge data-testid="interest-saved-badge" size="sm" variant="positive">
          £{interestSaved.toLocaleString("en-GB")} Saved
        </StatusBadge>
      </div>

      {/* Avalanche vs Snowball Toggles */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
          gap: "12px",
        })}
      >
        <button
          aria-label="Select Avalanche strategy"
          className={cx(strategyCard({ active: selectedStrategy === "avalanche" }))}
          type="button"
          onClick={() => onSelectStrategy("avalanche")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaBolt className={css({ color: "status.warning.solid" })} size={13} />
            <span className={css({ fontWeight: "bold", fontSize: "xs", color: "text.primary" })}>
              Avalanche (Highest APR)
            </span>
          </div>
          <span className={css({ fontSize: "11px", color: "text.muted", textAlign: "left" })}>
            Targets highest interest rates first. Maximises mathematically pure interest savings.
          </span>
          <div style={{ marginTop: "4px" }}>
            <StatusBadge size="sm" variant="brand">
              Mathematically Optimal
            </StatusBadge>
          </div>
        </button>

        <button
          aria-label="Select Snowball strategy"
          className={cx(strategyCard({ active: selectedStrategy === "snowball" }))}
          type="button"
          onClick={() => onSelectStrategy("snowball")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaSnowflake className={css({ color: "primary" })} size={13} />
            <span className={css({ fontWeight: "bold", fontSize: "xs", color: "text.primary" })}>
              Snowball (Smallest Pot)
            </span>
          </div>
          <span className={css({ fontSize: "11px", color: "text.muted", textAlign: "left" })}>
            Targets smallest balances first. Builds rapid psychological momentum with quick wins.
          </span>
          <div style={{ marginTop: "4px" }}>
            <StatusBadge size="sm" variant="info">
              Psychological Wins
            </StatusBadge>
          </div>
        </button>
      </div>
    </div>
  );
};

export default PayoffStrategyControls;
