import type { BudgetEntryItem } from "../../ai-context-pack.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { budgetRowMonthly, DEBT_CATEGORY, SAVINGS_CATEGORY } from "./budget-totals.js";

/** What has to be paid each month before anything is free to spend. Pounds a month. */
export interface EssentialCommitments {
  /** Essential budget rows, leaving out savings and debt-payment rows. */
  essentialsExcludingDebt: number;
  /** Minimum payments on debt accounts (stored, or estimated where none is stored). */
  accountMinimums: number;
  /** True when at least one account minimum is an estimate. */
  minimumsEstimated: boolean;
  /** Budget rows in the "debt" category. */
  budgetDebtPayments: number;
  /**
   * The larger of account minimums and budgeted debt payments, so a payment recorded in both
   * places is counted once.
   */
  debtCommitment: number;
  /** essentialsExcludingDebt + debtCommitment. Savings rows are never in it. */
  total: number;
  /**
   * Savings rows flagged essential (owner item 28): a regular saving the person would keep paying
   * if income stopped. Breathing room counts it with the essentials; safe to spend already takes
   * every savings row off as planned savings, so it is kept out of `total`.
   */
  essentialSavings: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Shared by safe to spend and months of cover so both use the same essentials. Not a figure of
 * its own: callers decide when it is unknown.
 */
export function essentialCommitments(
  budget: readonly BudgetEntryItem[],
  snapshot: PortfolioSnapshot,
): EssentialCommitments {
  let essentialsExcludingDebt = 0;
  let budgetDebtPayments = 0;
  let essentialSavings = 0;
  for (const row of budget) {
    // A linked line that is not set has no figure; callers treat the budget as unknown first.
    if (row.isIncome || row.notSet) continue;
    const monthly = budgetRowMonthly(row);
    if (row.category === SAVINGS_CATEGORY) {
      if (row.isEssential) essentialSavings += monthly;
      continue;
    }
    if (row.category === DEBT_CATEGORY) budgetDebtPayments += monthly;
    else if (row.isEssential) essentialsExcludingDebt += monthly;
  }
  const debts = snapshot.toDebtItems();
  const accountMinimums = debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0);
  const minimumsEstimated = debts.some((d) => d.minimumPaymentEstimated === true);
  const debtCommitment = Math.max(accountMinimums, budgetDebtPayments);
  return {
    essentialsExcludingDebt: round2(essentialsExcludingDebt),
    accountMinimums: round2(accountMinimums),
    minimumsEstimated,
    budgetDebtPayments: round2(budgetDebtPayments),
    debtCommitment: round2(debtCommitment),
    total: round2(essentialsExcludingDebt + debtCommitment),
    essentialSavings: round2(essentialSavings),
  };
}
