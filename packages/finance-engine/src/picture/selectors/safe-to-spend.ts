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
  /** How far commitments and planned savings go past income each month; 0 when they fit. */
  monthlyShortfall: number;
  /**
   * The income safe to spend starts from: the budget's income, the same figure "left over each
   * month" starts from (the linked take-home line when the person has it, or the income lines they
   * typed). Pounds a month.
   */
  incomeMonthly: number;
  plannedSavings: number;
  commitments: EssentialCommitments;
}

export const ESTIMATED_MINIMUMS_NOTE =
  "Some debt minimum payments are estimates because none is saved.";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Safe to spend (owner decision D-6-A): income less essentials, debt minimums and planned savings,
 * per week. The income is the budget's income (system audit slice 5, link L34): the linked
 * take-home line when the person chose it (or the engine added it to a budget with no income
 * lines), or the income lines the person typed. So safe to spend and "left over each month" start
 * from the same figure, and a typed take-home stays the person's own. With no income in the
 * budget it is unknown: never a guessed share of salary.
 */
export function selectSafeToSpend(
  takeHome: Figure<TakeHome>,
  budget: readonly BudgetEntryItem[],
  snapshot: PortfolioSnapshot,
): Figure<SafeToSpend> {
  const totals = selectBudgetTotals(budget);
  if (!isFigureKnown(totals) || !totals.value.hasIncome) {
    // The budget has no income to start from. Without a salary the take-home line cannot fill it.
    if (!isFigureKnown(takeHome) && takeHome.reason === "unsupported-year") {
      return figureUnknown([], "unsupported-year");
    }
    const missing = new Set<MissingKey>(isFigureKnown(takeHome) ? [] : takeHome.missing);
    if (!isFigureKnown(totals)) {
      for (const key of totals.missing) missing.add(key);
    } else {
      missing.add("budgetIncome");
      if (!totals.value.hasEssentials) missing.add("budgetEssentials");
    }
    return figureUnknown([...missing], "not-set");
  }
  if (!totals.value.hasEssentials) return figureUnknown(["budgetEssentials"], "not-set");

  const commitments = essentialCommitments(budget, snapshot);
  const plannedSavings = totals.value.savings;
  const incomeMonthly = totals.value.income;
  const result = calculateSafeToSpend(
    incomeMonthly,
    commitments.essentialsExcludingDebt + plannedSavings,
    commitments.debtCommitment,
    0,
  );
  const gap = incomeMonthly - commitments.total - plannedSavings;
  // The take-home's own assumptions apply only when its linked line is part of the income.
  const takeHomeCounted = budget.some((row) => row.linked === "take_home" && !row.notSet);
  const assumptions =
    takeHomeCounted && isFigureKnown(takeHome) ? [...(takeHome.assumptions ?? [])] : [];
  if (commitments.minimumsEstimated && commitments.debtCommitment === commitments.accountMinimums) {
    assumptions.push(ESTIMATED_MINIMUMS_NOTE);
  }

  return figureKnown<SafeToSpend>(
    {
      weekly: result.weeklyAllowance,
      daily: result.dailyAllowance,
      monthly: result.monthlyDiscretionary,
      monthlyShortfall: gap < 0 ? round2(-gap) : 0,
      incomeMonthly,
      plannedSavings,
      commitments,
    },
    assumptions.length > 0 ? "assumption" : "derived",
    assumptions,
  );
}
