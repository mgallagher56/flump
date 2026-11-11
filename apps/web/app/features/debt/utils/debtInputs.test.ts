import { describe, expect, it } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { buildDebtInputs } from "./debtInputs";

const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e",
  userId: "u",
  category: "bills",
  name: "Entry",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: false,
  notes: null,
  isDefault: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

describe("buildDebtInputs", () => {
  it("returns null surplus and essentials when there are no budget entries", () => {
    const result = buildDebtInputs([], [], []);
    expect(result.monthlySurplus).toBeNull();
    expect(result.monthlyEssentialExpenses).toBeNull();
    expect(result.liquidSavings).toBe(0);
  });

  it("computes surplus as monthly income minus expenses across frequencies", () => {
    const entries = [
      entry({ name: "Salary", isIncome: true, amount: 3000, frequency: "monthly" }),
      entry({ name: "Bonus", isIncome: true, amount: 1200, frequency: "annual" }),
      entry({ name: "Rent", amount: 1000, frequency: "monthly" }),
      entry({ name: "Food", amount: 100, frequency: "weekly" }),
      entry({ name: "Insurance", amount: 600, frequency: "annual" }),
    ];
    const result = buildDebtInputs([], [], entries);
    // income 3100, expenses 1000 + 100 * 52 / 12 + 50
    expect(result.monthlySurplus).toBeCloseTo(3100 - (1000 + (100 * 52) / 12 + 50), 5);
  });

  it("sums only essential non-income entries for essential expenses", () => {
    const entries = [
      entry({ name: "Salary", isIncome: true, isEssential: true, amount: 3000 }),
      entry({ name: "Rent", isEssential: true, amount: 900 }),
      entry({ name: "Water", isEssential: true, amount: 120, frequency: "annual" }),
      entry({ name: "Netflix", isEssential: false, amount: 15 }),
    ];
    expect(buildDebtInputs([], [], entries).monthlyEssentialExpenses).toBe(910);
  });

  it("sums liquid savings from current and saving accounts only", () => {
    const accounts = [
      { id: "a1", name: "Current", type: "Current", balance: 500 },
      { id: "a2", name: "Saver", type: "Saving", balance: 1500 },
      { id: "a3", name: "Card", type: "Credit Card", balance: -900 },
      { id: "a4", name: "ISA", type: "Investment", balance: 7000 },
    ];
    expect(buildDebtInputs(accounts, [], []).liquidSavings).toBe(2000);
  });
});
