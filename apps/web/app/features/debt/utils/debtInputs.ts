import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import { type BudgetEntry, toMonthly } from "~/types/budget";

export interface DebtInputs {
  /** Monthly income minus monthly expenses, or null when the user has no budget entries. */
  monthlySurplus: number | null;
  /** Current plus saving account balances. */
  liquidSavings: number;
  /** Monthly total of essential non-income entries, or null when the user has no budget entries. */
  monthlyEssentialExpenses: number | null;
}

export function buildDebtInputs(
  accounts: RawAccount[] | null | undefined,
  accountDetails: RawAccountDetail[] | null | undefined,
  budgetEntries: BudgetEntry[] | null | undefined,
): DebtInputs {
  const snapshot = new PortfolioSnapshot(accounts ?? [], accountDetails ?? []);
  const liquidSavings = snapshot.getTotalLiquidCash();
  const entries = budgetEntries ?? [];

  if (entries.length === 0) {
    return { monthlySurplus: null, liquidSavings, monthlyEssentialExpenses: null };
  }

  let income = 0;
  let expenses = 0;
  let essential = 0;
  for (const entry of entries) {
    const monthly = toMonthly(entry);
    if (entry.isIncome) {
      income += monthly;
    } else {
      expenses += monthly;
      if (entry.isEssential) essential += monthly;
    }
  }

  return {
    monthlySurplus: income - expenses,
    liquidSavings,
    monthlyEssentialExpenses: essential,
  };
}
