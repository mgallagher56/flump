import { Icon, SliderField, StatusBadge } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Snowflake, Zap } from "lucide-react";
import type { FC } from "react";
import {
  impactRow,
  impactTitle,
  strategyCard,
  strategyCardHint,
  strategyCardTitle,
  strategyContainer,
  strategyGrid,
  strategyHeading,
  strategySubheading,
} from "./PayoffStrategyControls.styles";

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
  interestSaved,
  monthsSaved,
  className,
}) => {
  const money = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
  return (
    <div className={cx(strategyContainer(), className)}>
      <div>
        <h3 className={strategyHeading}>Payoff order</h3>
        <p className={strategySubheading}>
          Compare paying the highest rate first with paying the smallest balance first.
        </p>
      </div>

      <SliderField
        helperText={
          monthsSaved !== undefined && monthsSaved > 0
            ? `Illustration: paid off ${monthsSaved} ${monthsSaved === 1 ? "month" : "months"} sooner than with minimum payments only`
            : "Move the slider to model an extra payment."
        }
        label="Extra payment each month"
        max={600}
        min={0}
        step={10}
        unitPrefix="£"
        unitSuffix="/mo"
        value={extraPayment}
        onChange={onChangeExtraPayment}
      />

      {interestSaved !== undefined && (
        <div className={impactRow}>
          <span className={impactTitle}>Interest saved compared with minimum payments only</span>
          <StatusBadge data-testid="interest-saved-badge" size="sm" variant="positive">
            {money.format(interestSaved)} saved
          </StatusBadge>
        </div>
      )}

      <div className={strategyGrid}>
        <button
          aria-pressed={selectedStrategy === "avalanche"}
          className={strategyCard({ active: selectedStrategy === "avalanche" })}
          type="button"
          onClick={() => onSelectStrategy("avalanche")}
        >
          <span className={strategyCardTitle}>
            <Icon icon={Zap} size="sm" />
            Highest rate first (avalanche)
          </span>
          <span className={strategyCardHint}>Pays the debt with the highest APR first.</span>
        </button>

        <button
          aria-pressed={selectedStrategy === "snowball"}
          className={strategyCard({ active: selectedStrategy === "snowball" })}
          type="button"
          onClick={() => onSelectStrategy("snowball")}
        >
          <span className={strategyCardTitle}>
            <Icon icon={Snowflake} size="sm" />
            Smallest balance first (snowball)
          </span>
          <span className={strategyCardHint}>Pays the debt with the smallest balance first.</span>
        </button>
      </div>
    </div>
  );
};

export default PayoffStrategyControls;
