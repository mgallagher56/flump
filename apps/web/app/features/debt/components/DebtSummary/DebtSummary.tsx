import { KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { figure, perMonth } from "./DebtSummary.styles";

export interface DebtSummaryProps {
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
  /** False when the payments never clear the debt. */
  payoffAchievable?: boolean;
}

const pluralMonths = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

/**
 * Debt page KPI strip (E15 T3.3). Four cards at most. "Debt-free by" is the page's single
 * `surface.hero` block; it falls back to a plain "Not set" card when an APR is missing,
 * because a 0% stand-in would invent an optimistic date.
 */
export const DebtSummary: FC<DebtSummaryProps> = ({
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
  payoffAchievable = true,
}) => {
  const canProject = !aprUnknown && payoffAchievable;
  const notCalculatedNote = aprUnknown
    ? "Add each debt's APR to calculate this"
    : "Your payments do not clear the debt yet";
  const orderLabel = strategy === "avalanche" ? "highest rate first" : "smallest balance first";

  return (
    <KpiStrip columns={4}>
      <KpiCard
        label="Debt-free by"
        subtext={
          canProject
            ? `${
                monthsShaved > 0
                  ? `${pluralMonths(monthsShaved)} sooner than minimum payments`
                  : "Paying the minimums only"
              }${minimumEstimated ? " (estimated: some minimums are estimates)" : ""}`
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
        value={<Money size="lg" value={totalDebt} />}
      />
      <KpiCard
        label="Paying each month"
        subtext={`${
          extraPayment > 0 ? "Minimums plus your extra payment" : "Minimum payments only"
        }${minimumEstimated ? " (minimums estimated)" : ""}`}
        value={
          <span className={figure}>
            <Money size="lg" value={monthlyMinimumTotal + extraPayment} />
            <span className={perMonth}>a month</span>
          </span>
        }
      />
      <KpiCard
        label="Interest saved"
        subtext={canProject ? `Versus minimums, paying ${orderLabel}` : notCalculatedNote}
        value={canProject ? <Money size="lg" value={totalInterestSaved} /> : null}
      />
    </KpiStrip>
  );
};

export default DebtSummary;
