import type { RawAccount, RawAccountDetail } from "@flump/finance-engine";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture, knownOrNull } from "~/utils/financialPicture";

export interface DebtInputs {
  /** The budget's monthly surplus, or null with no budget entries or no income row. */
  monthlySurplus: number | null;
  /** Current plus saving account balances (liquid cash). */
  liquidSavings: number;
  /** Monthly essential spending, or null when the user has no budget entries. */
  monthlyEssentialExpenses: number | null;
  /** Total debt: cards, loans and overdrawn current accounts (the dashboard's figure too). */
  totalDebt: number;
}

/** Debt-page inputs, read from the one financial picture so they match every other page. */
export function buildDebtInputs(
  accounts: RawAccount[] | null | undefined,
  accountDetails: RawAccountDetail[] | null | undefined,
  budgetEntries: BudgetEntry[] | null | undefined,
): DebtInputs {
  const picture = buildWorkspacePicture({ accounts, accountDetails, budgetEntries });
  const budget = knownOrNull(picture.budget);
  return {
    monthlySurplus: budget?.hasIncome ? budget.surplus : null,
    liquidSavings: picture.netWorth.liquidCash,
    monthlyEssentialExpenses: budget?.essentials ?? null,
    totalDebt: picture.debt.consumerDebt,
  };
}
