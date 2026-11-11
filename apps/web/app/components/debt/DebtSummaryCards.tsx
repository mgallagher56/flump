import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCalendarCheck, FaCoins, FaFire, FaPiggyBank } from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface DebtSummaryCardsProps {
  totalDebt: number;
  highInterestDebt: number;
  monthlyMinimumTotal: number;
  extraPayment: number;
  debtFreeDate: string;
  totalInterestSaved: number;
  monthsShaved: number;
  strategy: "avalanche" | "snowball";
  /** True when any debt has no stored APR: payoff date and interest saved cannot be calculated. */
  aprUnknown?: boolean;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  minimumEstimated?: boolean;
}

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    sm: "repeat(2, 1fr)",
    lg: "repeat(4, 1fr)",
  },
  gap: "16px",
});

const cardBodyStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "16px",
});

const cardHeaderStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
});

const iconBadgeStyle = (bg: string, color: string) =>
  css({
    width: "36px",
    height: "36px",
    borderRadius: "full",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: bg,
    color: color,
    flexShrink: 0,
  });

export const DebtSummaryCards: FC<DebtSummaryCardsProps> = ({
  totalDebt,
  highInterestDebt,
  monthlyMinimumTotal,
  extraPayment,
  debtFreeDate,
  totalInterestSaved,
  monthsShaved,
  strategy,
  aprUnknown = false,
  minimumEstimated = false,
}) => {
  const { formatCurrency } = useFormatCurrency();

  return (
    <div className={gridStyle}>
      {/* 1. Total Unsecured Debt */}
      <FLPCard>
        <div className={cardBodyStyle}>
          <div className={cardHeaderStyle}>
            <FLPText color="text.muted" fontSize="sm">
              Total Unsecured Debt
            </FLPText>
            <div className={iconBadgeStyle("rgba(239, 68, 68, 0.12)", "#ef4444")}>
              <FaFire size={18} />
            </div>
          </div>
          <FLPHeading as="h3" size="2xl" className="tabular-nums">
            {formatCurrency(totalDebt)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {highInterestDebt > 0
              ? `${formatCurrency(highInterestDebt)} at >6.5% APR or Overdraft`
              : "All high-cost debt cleared"}
          </FLPText>
        </div>
      </FLPCard>

      {/* 2. Monthly Debt Service */}
      <FLPCard>
        <div className={cardBodyStyle}>
          <div className={cardHeaderStyle}>
            <FLPText color="text.muted" fontSize="sm">
              Monthly Debt Budget
            </FLPText>
            <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "#f59e0b")}>
              <FaCoins size={18} />
            </div>
          </div>
          <FLPHeading as="h3" size="2xl" className="tabular-nums">
            {formatCurrency(monthlyMinimumTotal + extraPayment)}
            <span style={{ fontSize: "14px", fontWeight: "normal", color: "#6b7280" }}>/mo</span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {extraPayment > 0
              ? `Includes ${formatCurrency(extraPayment)} surplus overpayment`
              : "Minimum payments only"}
            {minimumEstimated ? " (minimums estimated)" : ""}
          </FLPText>
        </div>
      </FLPCard>

      {/* 3. Debt-Free Target Date */}
      <FLPCard>
        <div className={cardBodyStyle}>
          <div className={cardHeaderStyle}>
            <FLPText color="text.muted" fontSize="sm">
              Debt-Free Horizon
            </FLPText>
            <div className={iconBadgeStyle("rgba(16, 185, 129, 0.12)", "#10b981")}>
              <FaCalendarCheck size={18} />
            </div>
          </div>
          <FLPHeading as="h3" size="2xl" className="tabular-nums">
            {aprUnknown ? "Not calculated" : debtFreeDate}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {aprUnknown
              ? "Add each debt's APR to calculate this"
              : monthsShaved > 0
                ? `${monthsShaved} months sooner than minimum payments`
                : "Standard minimum schedule"}
          </FLPText>
        </div>
      </FLPCard>

      {/* 4. Interest Saved */}
      <FLPCard>
        <div className={cardBodyStyle}>
          <div className={cardHeaderStyle}>
            <FLPText color="text.muted" fontSize="sm">
              Interest Saved ({strategy === "avalanche" ? "Avalanche" : "Snowball"})
            </FLPText>
            <div className={iconBadgeStyle("rgba(99, 99, 241, 0.12)", "#6363f1")}>
              <FaPiggyBank size={18} />
            </div>
          </div>
          <FLPHeading as="h3" size="2xl" className="tabular-nums">
            {aprUnknown ? "Not calculated" : formatCurrency(totalInterestSaved)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {aprUnknown
              ? "Add each debt's APR to calculate this"
              : "Compared to making minimum payments only"}
          </FLPText>
        </div>
      </FLPCard>
    </div>
  );
};

export default DebtSummaryCards;
