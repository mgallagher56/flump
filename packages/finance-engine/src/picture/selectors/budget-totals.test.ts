import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { isFigureKnown } from "../figure.js";
import { budgetRowMonthly, selectBudgetTotals } from "./budget-totals.js";

const row = (over: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "r",
  category: "bills",
  name: "Row",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: false,
  ...over,
});

describe("budgetRowMonthly", () => {
  it("converts weekly and annual rows to monthly", () => {
    expect(budgetRowMonthly({ amount: 120, frequency: "annual" })).toBe(10);
    expect(budgetRowMonthly({ amount: 12, frequency: "weekly" })).toBe(52);
    expect(budgetRowMonthly({ amount: 40, frequency: "monthly" })).toBe(40);
  });

  it("treats an unreadable amount as 0", () => {
    expect(budgetRowMonthly({ amount: Number.NaN, frequency: "monthly" })).toBe(0);
  });
});

describe("selectBudgetTotals", () => {
  it("is unknown with no rows, never £0", () => {
    expect(selectBudgetTotals([])).toEqual({
      status: "unknown",
      missing: ["budget"],
      reason: "not-set",
    });
  });

  it("splits income, essentials, savings and discretionary", () => {
    const fig = selectBudgetTotals([
      row({ id: "i", category: "income", amount: 2500, isIncome: true }),
      row({ id: "rent", category: "housing", amount: 900, isEssential: true }),
      row({ id: "card", category: "debt", amount: 100, isEssential: true }),
      // Savings is its own line even when flagged essential.
      row({ id: "isa", category: "savings", amount: 200, isEssential: true }),
      row({ id: "gym", category: "expenses", amount: 30 }),
      row({ id: "ins", category: "bills", amount: 120, frequency: "annual", isEssential: true }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toEqual({
      income: 2500,
      essentials: 1010,
      savings: 200,
      discretionary: 30,
      outgoings: 1040,
      surplus: 1260,
      debtPayments: 100,
      hasIncome: true,
      hasEssentials: true,
    });
    expect(fig.provenance).toBe("derived");
  });

  it("gives a negative surplus when spending is more than income", () => {
    const fig = selectBudgetTotals([
      row({ category: "income", amount: 1000, isIncome: true }),
      row({ category: "housing", amount: 1200, isEssential: true }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.surplus).toBe(-200);
  });

  it("knows the totals but flags missing income rows", () => {
    const fig = selectBudgetTotals([row({ category: "housing", amount: 800, isEssential: true })]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.hasIncome).toBe(false);
    expect(fig.value.income).toBe(0);
  });
});

describe("selectBudgetTotals essentials flag", () => {
  it("does not count £0 suggested essential rows as essentials entered", () => {
    const fig = selectBudgetTotals([
      row({ category: "housing", name: "Rent / Mortgage", amount: 0, isEssential: true }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.hasEssentials).toBe(false);
  });
});
