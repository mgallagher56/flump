import type { BudgetEntryItem } from "../../ai-context-pack.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import { selectBudgetTotals } from "./budget-totals.js";
import { type EssentialCommitments, essentialCommitments } from "./commitments.js";

export interface MonthsOfCover {
  /** Liquid cash over monthly essential commitments, to one decimal place. */
  months: number;
  /** Current and savings balances, each at least 0 (an overdraft is debt, not netted here). */
  liquidCash: number;
  /** Monthly essential commitments, the same ones safe to spend uses. */
  monthlyEssentials: number;
  commitments: EssentialCommitments;
}

/**
 * Months of cover ("emergency runway" internally): how long liquid cash would cover essential
 * commitments if income stopped. Saved data only: no account preference, no scenario inputs.
 */
export function selectMonthsOfCover(
  budget: readonly BudgetEntryItem[],
  snapshot: PortfolioSnapshot,
): Figure<MonthsOfCover> {
  const totals = selectBudgetTotals(budget);
  if (!isFigureKnown(totals)) return figureUnknown(["budget"], "not-set");
  // No essential spending entered (or only £0 suggestions): unknown, never "infinite". The same
  // rule as safe to spend, so the two figures are known or unknown together.
  if (!totals.value.hasEssentials) return figureUnknown(["budgetEssentials"], "not-set");
  const commitments = essentialCommitments(budget, snapshot);
  const liquidCash = snapshot.getTotalLiquidCash();
  return figureKnown<MonthsOfCover>({
    months: Math.round((liquidCash / commitments.total) * 10) / 10,
    liquidCash,
    monthlyEssentials: commitments.total,
    commitments,
  });
}
