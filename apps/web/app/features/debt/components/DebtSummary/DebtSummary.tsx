import { Button, HeroFigure, KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { figure, perMonth, summaryStack } from "./DebtSummary.styles";

export interface DebtSummaryProps {
  /** Saved total owed, always a positive amount (liabilities are stored negative). */
  totalDebt: number;
  /** How many debts make up the total. */
  debtCount: number;
  /** Sum of the saved minimum payments. */
  monthlyMinimumTotal: number;
  /** Debt-free date when paying the minimum payments only (an estimate). */
  debtFreeDate: string;
  /** Interest in the next 12 months at the minimum payments (an estimate). */
  interestThisYear: number;
  /** How many debts have no stored APR. Any missing APR means the estimates cannot be worked out. */
  missingAprCount?: number;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  minimumEstimated?: boolean;
  /** False when the minimum payments never pay off the debts. */
  payoffAchievable?: boolean;
  /** Opens the edit form for a debt without a rate (the one prompt's one button). */
  onAddRate?: () => void;
}

/**
 * Debt page first view (E16 PR 6, ruling D2): the saved total in `HeroFigure`, then a strip of 3.
 * The debt-free date is an estimate, so it is the first KPI with an "Estimate" caption, never the
 * hero. Saved figures only: nothing here reads the scenario zone. With an APR missing, the two
 * estimates cannot be worked out and one prompt with one button replaces the strip (P3.2).
 */
export const DebtSummary: FC<DebtSummaryProps> = ({
  totalDebt,
  debtCount,
  monthlyMinimumTotal,
  debtFreeDate,
  interestThisYear,
  missingAprCount = 0,
  minimumEstimated = false,
  payoffAchievable = true,
  onAddRate,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const aprUnknown = missingAprCount > 0;
  const estimatesNote = minimumEstimated ? ". Some minimum payments are estimates" : "";

  return (
    <div className={summaryStack}>
      <HeroFigure
        id="debt-total"
        label="Total you owe"
        subline={`Across ${debtCount} ${debtCount === 1 ? "debt" : "debts"}`}
        value={<span data-figure="debt.total">{formatCurrency(Math.abs(totalDebt))}</span>}
      />
      <KpiStrip
        emptyPrompt={{
          title:
            missingAprCount === 1 && debtCount === 1
              ? "Add the rate for your debt to see your debt-free date"
              : `Add the rate for ${missingAprCount} ${missingAprCount === 1 ? "debt" : "debts"} to see your debt-free date`,
          action: onAddRate ? (
            <Button size="sm" type="button" variant="outline" onClick={onAddRate}>
              Add a rate
            </Button>
          ) : undefined,
        }}
        items={[
          <KpiCard
            key="date"
            label="Debt-free by"
            subtext={
              payoffAchievable
                ? `Estimate at your current payments${estimatesNote}`
                : "Estimate: at the minimum payments, these debts are not paid off"
            }
            unset={aprUnknown}
            value={
              aprUnknown ? null : (
                <span className={figure}>{payoffAchievable ? debtFreeDate : "Not paid off"}</span>
              )
            }
          />,
          <KpiCard
            key="monthly"
            label="Paying each month"
            subtext={`Minimum payments${minimumEstimated ? ", some are estimates" : ""}`}
            value={
              <span className={figure}>
                <Money size="lg" value={monthlyMinimumTotal} />
                <span className={perMonth}>a month</span>
              </span>
            }
          />,
          <KpiCard
            key="interest"
            label="Interest this year"
            subtext={`Estimate at your current payments${estimatesNote}`}
            unset={aprUnknown}
            value={aprUnknown ? null : <Money size="lg" value={interestThisYear} />}
          />,
        ]}
      />
    </div>
  );
};

export default DebtSummary;
