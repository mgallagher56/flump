export interface BudgetEntry {
  id: string;
  userId: string;
  category: "housing" | "bills" | "expenses" | "savings" | "income";
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly";
  isIncome: boolean;
  isPrimaryIncome: boolean;
  isEssential: boolean;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BudgetCategory = BudgetEntry["category"];

/** Normalise any entry to a monthly amount */
export function toMonthly(entry: BudgetEntry): number {
  switch (entry.frequency) {
    case "annual":
      return entry.amount / 12;
    case "weekly":
      return entry.amount * (52 / 12);
    default:
      return entry.amount;
  }
}

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  income: "Income",
};

export const CATEGORY_COLOURS: Record<BudgetCategory, string> = {
  housing: "#6363f1",
  bills: "#f59e0b",
  expenses: "#ec4899",
  savings: "#10b981",
  income: "#3b82f6",
};

export const CATEGORY_ICONS: Record<BudgetCategory, string> = {
  housing: "🏠",
  bills: "⚡",
  expenses: "💳",
  savings: "🐷",
  income: "💼",
};
