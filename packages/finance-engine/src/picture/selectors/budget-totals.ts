import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";

/** Monthly budget totals from saved budget rows. All amounts are pounds a month. */
export interface BudgetTotals {
  /** Budgeted income: the sum of income rows (not take-home from salary). */
  income: number;
  /** Non-income rows flagged essential, excluding savings rows. Includes debt-payment rows. */
  essentials: number;
  /** Non-income rows in the "savings" category, whatever their essential flag. */
  savings: number;
  /** Every other non-income row. */
  discretionary: number;
  /** Essentials plus discretionary. Savings is its own line. */
  outgoings: number;
  /** Income less outgoings less savings. Negative when spending is more than income. */
  surplus: number;
  /** Non-income rows in the "debt" category (already inside essentials or discretionary). */
  debtPayments: number;
  /** True when at least one income row exists. */
  hasIncome: boolean;
  /** True when at least one essential row exists. */
  hasEssentials: boolean;
}

export const SAVINGS_CATEGORY = "savings";
export const DEBT_CATEGORY = "debt";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A budget row as pounds a month. Weekly is 52/12 weeks a month; an unreadable amount is 0. */
export function budgetRowMonthly(entry: Pick<BudgetEntryItem, "amount" | "frequency">): number {
  const amount = Number(entry.amount);
  const safe = Number.isFinite(amount) ? amount : 0;
  if (entry.frequency === "weekly") return (safe * 52) / 12;
  if (entry.frequency === "annual") return safe / 12;
  return safe;
}

/** The one budget-totals selector. No rows means unknown, never £0. */
export function selectBudgetTotals(budget: readonly BudgetEntryItem[]): Figure<BudgetTotals> {
  if (budget.length === 0) return figureUnknown(["budget"], "not-set");

  let income = 0;
  let essentials = 0;
  let savings = 0;
  let discretionary = 0;
  let debtPayments = 0;
  let hasIncome = false;
  let hasEssentials = false;

  for (const row of budget) {
    const monthly = budgetRowMonthly(row);
    if (row.isIncome) {
      hasIncome = true;
      income += monthly;
      continue;
    }
    if (row.category === DEBT_CATEGORY) debtPayments += monthly;
    if (row.category === SAVINGS_CATEGORY) {
      savings += monthly;
    } else if (row.isEssential) {
      hasEssentials = true;
      essentials += monthly;
    } else {
      discretionary += monthly;
    }
  }

  return figureKnown<BudgetTotals>({
    income: round2(income),
    essentials: round2(essentials),
    savings: round2(savings),
    discretionary: round2(discretionary),
    outgoings: round2(essentials + discretionary),
    surplus: round2(income - essentials - discretionary - savings),
    debtPayments: round2(debtPayments),
    hasIncome,
    hasEssentials,
  });
}
