// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
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
    // Rounded to the penny by the engine's budget totals.
    expect(result.monthlySurplus).toBeCloseTo(3100 - (1000 + (100 * 52) / 12 + 50), 2);
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

describe("buildDebtInputs without income rows", () => {
  it("gives no surplus rather than minus the spending", () => {
    const result = buildDebtInputs(
      [],
      [],
      [entry({ name: "Rent", isEssential: true, amount: 900 })],
    );
    expect(result.monthlySurplus).toBeNull();
    expect(result.monthlyEssentialExpenses).toBe(900);
  });
});

describe("debtInputsFromPicture in 2027/28 (refused Plan 1)", () => {
  afterEach(() => vi.useRealTimers());

  it("says the left over figure leaves the refused loan out", () => {
    // Fixed date in tax year 2027/28, when the Plan 1 threshold is not published.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-05-01T12:00:00Z"));
    const entries = [
      entry({ name: "Pay", isIncome: true, amount: 0, linkKind: "take_home" }),
      entry({ name: "Rent", amount: 900 }),
    ];
    const result = buildDebtInputs([], [], entries, {
      annualSalary: 40000,
      employmentType: "employed",
      taxRegion: "ENGLAND",
      studentLoanPlans: ["PLAN_1"],
      pensionPercent: 0,
      isSalarySacrifice: false,
    });
    expect(result.monthlySurplus).not.toBeNull();
    expect(result.monthlySurplusLeavesOut).toBe(
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
    );
  });

  it("leaves nothing to say without a refused plan", () => {
    const result = buildDebtInputs(
      [],
      [],
      [entry({ name: "Salary", isIncome: true, amount: 3000 })],
    );
    expect(result.monthlySurplusLeavesOut).toBeNull();
  });
});
