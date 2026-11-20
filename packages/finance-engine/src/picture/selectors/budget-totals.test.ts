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

  it("counts a joint row at the user's share (E34 C1)", () => {
    // £1,200 a month, joint with no share saved: 50%, so £600.
    expect(budgetRowMonthly({ amount: 1200, frequency: "monthly", ownership: "joint" })).toBe(600);
    // £120 a week at 25%: 120 x 52 / 12 = £520 a month, a quarter is £130.
    expect(
      budgetRowMonthly({ amount: 120, frequency: "weekly", ownership: "joint", sharePercent: 25 }),
    ).toBe(130);
    // A sole row keeps every penny, whatever share is stored.
    expect(budgetRowMonthly({ amount: 40, frequency: "monthly", ownership: "sole" })).toBe(40);
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

  it("totals joint rows at the user's share, income included (E34 C1)", () => {
    const fig = selectBudgetTotals([
      // Joint rental income £1,000 at 50%: £500 is mine.
      row({ id: "i", category: "income", amount: 1000, isIncome: true, ownership: "joint" }),
      // Joint rent £1,400 at 40%: £560 is mine.
      row({
        id: "r",
        category: "housing",
        amount: 1400,
        isEssential: true,
        ownership: "joint",
        sharePercent: 40,
      }),
      // Sole gym £30 in full.
      row({ id: "g", category: "expenses", amount: 30 }),
      // Joint savings £200 at 50%: £100.
      row({ id: "s", category: "savings", amount: 200, ownership: "joint" }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({
      income: 500,
      essentials: 560,
      discretionary: 30,
      savings: 100,
      outgoings: 590,
      // 500 - 560 - 30 - 100 = -190
      surplus: -190,
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

describe("selectBudgetTotals income flag (BU-8)", () => {
  it("does not count a £0 income row as income entered", () => {
    // Wizard saves "Salary" with no amount as £0, plus rent £900.
    // Income is not known, so hasIncome must be false (like hasEssentials),
    // and the page shows left over as unknown rather than "short by £900".
    const fig = selectBudgetTotals([
      row({ category: "income", name: "Salary", amount: 0, isIncome: true }),
      row({ category: "housing", name: "Rent", amount: 900, isEssential: true }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.hasIncome).toBe(false);
    expect(fig.value.essentials).toBe(900);
  });

  it("counts income once one row has an amount above £0", () => {
    // £0 Salary plus £1,500 Freelance: income 0 + 1,500 = 1,500; hasIncome true.
    const fig = selectBudgetTotals([
      row({ category: "income", name: "Salary", amount: 0, isIncome: true }),
      row({ category: "income", name: "Freelance", amount: 1500, isIncome: true }),
    ]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.hasIncome).toBe(true);
    expect(fig.value.income).toBe(1500);
  });
});

describe("selectBudgetTotals carries what the take-home leaves out", () => {
  const NOTE = "A loan is left out.";
  const rent = row({ category: "housing", name: "Rent", amount: 900, isEssential: true });
  const linkedPay = (amount: number) =>
    row({ category: "income", name: "Pay", amount, isIncome: true, linked: "take_home" });

  it("adds the note as an assumption when the linked take-home line is counted", () => {
    const fig = selectBudgetTotals([linkedPay(2000), rent], [NOTE]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe("assumption");
    expect(fig.assumptions).toEqual([NOTE]);
  });

  it("stays derived when the take-home leaves nothing out", () => {
    const fig = selectBudgetTotals([linkedPay(2000), rent], []);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe("derived");
    expect(fig.assumptions).toBeUndefined();
  });

  it("adds no note when the linked take-home line counts £0", () => {
    const fig = selectBudgetTotals([linkedPay(0), rent], [NOTE]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe("derived");
    expect(fig.assumptions).toBeUndefined();
  });

  it("adds no note when no line is linked to the take-home", () => {
    const pay = row({ category: "income", name: "Pay", amount: 2000, isIncome: true });
    const fig = selectBudgetTotals([pay, rent], [NOTE]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe("derived");
  });
});
