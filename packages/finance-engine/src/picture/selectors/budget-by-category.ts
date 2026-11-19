import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { budgetRowMonthly, SAVINGS_CATEGORY } from "./budget-totals.js";

/** Which `BudgetTotals` line a category's rows fall in. */
export type BudgetGroup = "essentials" | "discretionary" | "savings";

export interface BudgetCategoryTotal {
  category: string;
  /** Pounds a month at the user's share, to the penny. */
  monthly: number;
  /** True for the essentials group. Savings rows are never essential, whatever their flag. */
  essential: boolean;
  group: BudgetGroup;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Monthly spending by category, largest first. Income rows are left out. Rows are grouped exactly
 * as `selectBudgetTotals` groups them (the savings category is its own group; other rows are
 * essentials or discretionary by their flag), so the categories of each group add up to that
 * group's total, give or take a penny of rounding per category.
 */
export function selectBudgetByCategory(budget: readonly BudgetEntryItem[]): BudgetCategoryTotal[] {
  const totals = new Map<string, { category: string; monthly: number; group: BudgetGroup }>();
  for (const row of budget) {
    if (row.isIncome) continue;
    // A linked line whose saved fact is not set has no figure: left out, never counted as £0.
    if (row.notSet) continue;
    const group: BudgetGroup =
      row.category === SAVINGS_CATEGORY
        ? "savings"
        : row.isEssential
          ? "essentials"
          : "discretionary";
    const key = `${group}|${row.category}`;
    const cur = totals.get(key) ?? { category: row.category, monthly: 0, group };
    cur.monthly += budgetRowMonthly(row);
    totals.set(key, cur);
  }
  return [...totals.values()]
    .map((t) => ({
      category: t.category,
      monthly: round2(t.monthly),
      essential: t.group === "essentials",
      group: t.group,
    }))
    .sort((a, b) => b.monthly - a.monthly);
}
