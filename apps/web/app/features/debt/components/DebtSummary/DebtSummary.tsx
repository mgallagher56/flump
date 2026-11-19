import { ASSUMED_PROMO_REVERT_APR_PCT } from "@flump/finance-engine";
import { Button, HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { assumptionLine, summaryStack } from "./DebtSummary.styles";

export interface DebtSummaryProps {
  /** Saved total owed, always a positive amount (liabilities are stored negative). */
  totalDebt: number;
  /** How many debts make up the total. */
  debtCount: number;
  /** Sum of the saved minimum payments. */
  monthlyMinimumTotal: number;
  /** Debt-free date when paying the minimum payments only (an estimate). */
  debtFreeDate: string;
  /** How many debts have no stored APR. Any missing APR means the estimates cannot be worked out. */
  missingAprCount?: number;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  minimumEstimated?: boolean;
  /** False when the minimum payments never pay off the debts. */
  payoffAchievable?: boolean;
  /** Opens the edit form for a debt without a rate (the one prompt's one button). */
  onAddRate?: () => void;
  /** True when a 0% deal ends inside the schedule with no rate saved for after it. */
  promoRevertAssumed?: boolean;
}

/** How the debt-free date is worked out (UX extra C): its inputs and assumptions, no judgement. */
/** The quiet line shown when the rate after a 0% deal is the engine's assumption. */
export const PROMO_REVERT_ASSUMED_LINE = `After a 0% deal ends we assume ${new Intl.NumberFormat(
  "en-GB",
  { maximumFractionDigits: 2 },
).format(ASSUMED_PROMO_REVERT_APR_PCT)}% APR, as no rate for after the deal is saved.`;

export const ESTIMATE_EXPLAIN =
  "Worked out from your saved balances, APRs and minimum payments. It assumes no new borrowing and that rates stay the same, apart from a 0% deal ending.";

/**
 * Debt page first view (E16 PR 6, ruling D2): the saved total in `HeroFigure`, then a strip of 2.
 * The debt-free date is an estimate, so it is the first KPI with an "Estimate" caption, never the
 * hero. Saved figures only: nothing here reads the scenario zone. With an APR missing, the date
 * cannot be worked out and one prompt with one button replaces the strip (P3.2).
 */
export const DebtSummary: FC<DebtSummaryProps> = ({
  totalDebt,
  debtCount,
  monthlyMinimumTotal,
  debtFreeDate,
  missingAprCount = 0,
  minimumEstimated = false,
  payoffAchievable = true,
  onAddRate,
  promoRevertAssumed = false,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const aprUnknown = missingAprCount > 0;

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
            explain={ESTIMATE_EXPLAIN}
            key="date"
            label="Debt-free date"
            subtext="Estimate"
            unset={aprUnknown}
            value={aprUnknown ? null : payoffAchievable ? debtFreeDate : "Not paid off"}
          />,
          <KpiCard
            // The total is added up from the saved minimums. The explain also keeps this card's
            // label row the same height as its neighbour, which carries an info button.
            explain={
              minimumEstimated
                ? "The minimum payments saved on your debts, added up. Where none is saved, an estimate is used."
                : "The minimum payments saved on your debts, added up."
            }
            key="monthly"
            label="Paying each month"
            subtext={`Minimum payments${minimumEstimated ? ", some are estimates" : ""}`}
            value={monthlyMinimumTotal}
          />,
        ]}
      />
      {promoRevertAssumed && !aprUnknown ? (
        <p className={assumptionLine}>{PROMO_REVERT_ASSUMED_LINE}</p>
      ) : null}
    </div>
  );
};

export default DebtSummary;
