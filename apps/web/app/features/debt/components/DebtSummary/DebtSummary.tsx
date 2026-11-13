import { KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { figure, perMonth } from "./DebtSummary.styles";

export interface DebtSummaryProps {
  totalDebt: number;
  highInterestDebt: number;
  /** Sum of the saved minimum payments. */
  monthlyMinimumTotal: number;
  /** Finish date when paying the minimums only. */
  debtFreeDate: string;
  /** Total interest when paying the minimums only. */
  totalInterest: number;
  /** True when any debt has no stored APR: payoff date and interest cannot be calculated. */
  aprUnknown?: boolean;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  minimumEstimated?: boolean;
  /** False when the minimum payments never clear the debt. */
  payoffAchievable?: boolean;
}

/**
 * Debt page KPI strip (E15 T3.3). Saved figures only: it never reads the scenario zone's extra
 * payment or payoff order, so every figure assumes minimum payments. Four cards at most.
 * "Debt-free by" is the page's single `surface.hero` block; it falls back to a plain "Not set"
 * card when an APR is missing, because a 0% stand-in would invent an optimistic date.
 */
export const DebtSummary: FC<DebtSummaryProps> = ({
  totalDebt,
  highInterestDebt,
  monthlyMinimumTotal,
  debtFreeDate,
  totalInterest,
  aprUnknown = false,
  minimumEstimated = false,
  payoffAchievable = true,
}) => {
  const canProject = !aprUnknown && payoffAchievable;
  const notCalculatedNote = aprUnknown
    ? "Add each debt's APR to calculate this"
    : "Your minimum payments do not clear the debt yet";

  return (
    <KpiStrip columns={4}>
      <KpiCard
        label="Debt-free by"
        subtext={
          canProject
            ? `Paying the minimums only${minimumEstimated ? " (estimated: some minimums are estimates)" : ""}`
            : notCalculatedNote
        }
        tone="hero"
        value={canProject ? <span className={figure}>{debtFreeDate}</span> : null}
      />
      <KpiCard
        label="Total you owe"
        subtext={
          highInterestDebt > 0 ? (
            <>
              <Money size="sm" value={highInterestDebt} /> on cards, overdrafts or at 6.5% APR or
              more
            </>
          ) : (
            "No card, overdraft or 6.5%+ APR debt"
          )
        }
        value={
          <span data-figure="debt.total">
            <Money size="lg" value={totalDebt} />
          </span>
        }
      />
      <KpiCard
        label="Paying each month"
        subtext={`Minimum payments only${minimumEstimated ? " (minimums estimated)" : ""}`}
        value={
          <span className={figure}>
            <Money size="lg" value={monthlyMinimumTotal} />
            <span className={perMonth}>a month</span>
          </span>
        }
      />
      <KpiCard
        label="Interest to pay"
        subtext={canProject ? "Total, paying the minimums only" : notCalculatedNote}
        value={canProject ? <Money size="lg" value={totalInterest} /> : null}
      />
    </KpiStrip>
  );
};

export default DebtSummary;
