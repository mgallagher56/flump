import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { calculateSafeToSpend } from "../../health-score.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import type { MissingKey } from "../input.js";
import { selectBudgetTotals } from "./budget-totals.js";
import { type EssentialCommitments, essentialCommitments } from "./commitments.js";
import type { TakeHome } from "./take-home.js";

export interface SafeToSpend {
  weekly: number;
  daily: number;
  /** Monthly amount free to spend, never below 0. */
  monthly: number;
  /** How far commitments and planned savings go past take-home each month; 0 when they fit. */
  monthlyShortfall: number;
  takeHomeMonthly: number;
  plannedSavings: number;
  commitments: EssentialCommitments;
}

export const ESTIMATED_MINIMUMS_NOTE =
  "Some debt minimum payments are estimates because none is saved.";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Safe to spend (owner decision D-6-A): take-home less essentials, debt minimums and planned
 * savings, per week. Take-home comes from the profile, never from a guessed share of salary.
 */
export function selectSafeToSpend(
  takeHome: Figure<TakeHome>,
  budget: readonly BudgetEntryItem[],
  snapshot: PortfolioSnapshot,
): Figure<SafeToSpend> {
  const totals = selectBudgetTotals(budget);
  const missing: MissingKey[] = [];
  if (!isFigureKnown(takeHome)) {
    if (takeHome.reason === "unsupported-year") return figureUnknown([], "unsupported-year");
    missing.push(...takeHome.missing);
  }
  if (!isFigureKnown(totals)) missing.push("budget");
  else if (!totals.value.hasEssentials) missing.push("budgetEssentials");
  if (missing.length > 0 || !isFigureKnown(takeHome) || !isFigureKnown(totals)) {
    return figureUnknown(missing, "not-set");
  }

  const commitments = essentialCommitments(budget, snapshot);
  const plannedSavings = totals.value.savings;
  const takeHomeMonthly = takeHome.value.monthly;
  const result = calculateSafeToSpend(
    takeHomeMonthly,
    commitments.essentialsExcludingDebt + plannedSavings,
    commitments.debtCommitment,
    0,
  );
  const gap = takeHomeMonthly - commitments.total - plannedSavings;
  const assumptions = [...(takeHome.assumptions ?? [])];
  if (commitments.minimumsEstimated && commitments.debtCommitment === commitments.accountMinimums) {
    assumptions.push(ESTIMATED_MINIMUMS_NOTE);
  }

  return figureKnown<SafeToSpend>(
    {
      weekly: result.weeklyAllowance,
      daily: result.dailyAllowance,
      monthly: result.monthlyDiscretionary,
      monthlyShortfall: gap < 0 ? round2(-gap) : 0,
      takeHomeMonthly,
      plannedSavings,
      commitments,
    },
    assumptions.length > 0 ? "assumption" : "derived",
    assumptions,
  );
}
