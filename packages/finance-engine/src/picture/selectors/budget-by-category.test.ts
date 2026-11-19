import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { isFigureKnown } from "../figure.js";
import { selectBudgetByCategory } from "./budget-by-category.js";
import { selectBudgetTotals } from "./budget-totals.js";

const row = (over: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "r",
  category: "bills",
  name: "Row",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

describe("selectBudgetByCategory", () => {
  // Salary £2,500 (income, left out). Housing £900 essential. Food £300 essential plus a £50
  // non-essential food row. Savings £200 saved as essential (savings is its own group). Card row
  // £100 in "debt", essential. Weekly hobby £15 = 15 x 52 / 12 = £65, discretionary.
  const budget = [
    row({ category: "income", amount: 2500, isIncome: true }),
    row({ category: "housing", amount: 900 }),
    row({ category: "food", amount: 300 }),
    row({ category: "food", amount: 50, isEssential: false }),
    row({ category: "savings", amount: 200 }),
    row({ category: "debt", amount: 100 }),
    row({ category: "hobbies", amount: 15, frequency: "weekly", isEssential: false }),
  ];

  it("groups rows as the budget totals do, largest first", () => {
    expect(selectBudgetByCategory(budget)).toEqual([
      { category: "housing", monthly: 900, essential: true, group: "essentials" },
      { category: "food", monthly: 300, essential: true, group: "essentials" },
      { category: "savings", monthly: 200, essential: false, group: "savings" },
      { category: "debt", monthly: 100, essential: true, group: "essentials" },
      { category: "hobbies", monthly: 65, essential: false, group: "discretionary" },
      { category: "food", monthly: 50, essential: false, group: "discretionary" },
    ]);
  });

  it("adds up to the budget totals", () => {
    // Essentials 900 + 300 + 100 = 1,300; discretionary 65 + 50 = 115; savings 200.
    // Left over 2,500 - 1,300 - 115 - 200 = 885.
    const cats = selectBudgetByCategory(budget);
    const sum = (g: string) => cats.filter((c) => c.group === g).reduce((s, c) => s + c.monthly, 0);
    expect(sum("essentials")).toBe(1300);
    expect(sum("discretionary")).toBe(115);
    expect(sum("savings")).toBe(200);
    const totals = selectBudgetTotals(budget);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value).toMatchObject({
      essentials: 1300,
      discretionary: 115,
      savings: 200,
      surplus: 885,
    });
  });

  it("counts a joint row at the user's share", () => {
    // Joint rent £1,600 with no share saved counts at 50% = £800.
    expect(
      selectBudgetByCategory([row({ category: "housing", amount: 1600, ownership: "joint" })]),
    ).toEqual([{ category: "housing", monthly: 800, essential: true, group: "essentials" }]);
  });

  it("is empty with no spending rows", () => {
    expect(selectBudgetByCategory([])).toEqual([]);
    expect(selectBudgetByCategory([row({ amount: 2000, isIncome: true })])).toEqual([]);
  });
});
