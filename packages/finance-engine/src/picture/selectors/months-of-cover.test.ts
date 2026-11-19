import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { defaultIsEssential } from "../../budget-entry-names.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { isFigureKnown } from "../figure.js";
import { essentialCommitments } from "./commitments.js";
import { monthsOfCoverFor, selectMonthsOfCover } from "./months-of-cover.js";

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

describe("selectMonthsOfCover", () => {
  it("divides liquid cash by essential commitments, to one decimal place", () => {
    const fig = selectMonthsOfCover(
      [row({ amount: 1000 }), row({ amount: 40, isEssential: false })],
      new PortfolioSnapshot([
        { id: "cur", name: "Current", type: "Current", balance: 1500 },
        { id: "sav", name: "Saver", type: "Saving", balance: 2200 },
        // Investments and pensions are not cash.
        { id: "isa", name: "S&S ISA", type: "Investment", balance: 50000 },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 3.7, liquidCash: 3700, monthlyEssentials: 1000 });
  });

  it("counts a joint rent row and a joint savings account at the user's share (E34 C1)", () => {
    // Joint rent £1,600 at 50% = £800 a month. Joint saver £6,000 at 50% = £3,000 of cash.
    // 3,000 / 800 = 3.75, shown as 3.8 months.
    const fig = selectMonthsOfCover(
      [row({ category: "housing", amount: 1600, ownership: "joint" })],
      new PortfolioSnapshot([
        { id: "sav", name: "Saver", type: "Saving", balance: 6000, ownership: "joint" },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 3.8, liquidCash: 3000, monthlyEssentials: 800 });
  });

  it("rounds to one decimal (never truncates) and leaves non-essential rows out", () => {
    // £4,000 cash over £950 essential rent; the £800 non-essential row is not divided by.
    const fig = selectMonthsOfCover(
      [row({ amount: 950 }), row({ amount: 800, isEssential: false })],
      new PortfolioSnapshot([{ id: "sav", name: "Saver", type: "Saving", balance: 4000 }]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 4.2, monthlyEssentials: 950 });
    // 4,000 / 1,750 = 2.286: rounds up to 2.3, where truncation would show 2.2.
    const both = selectMonthsOfCover(
      [row({ amount: 950 }), row({ amount: 800 })],
      new PortfolioSnapshot([{ id: "sav", name: "Saver", type: "Saving", balance: 4000 }]),
    );
    if (!isFigureKnown(both)) throw new Error("expected known");
    expect(both.value.months).toBe(2.3);
  });

  it("counts debt minimums in the essential commitments", () => {
    // £1,500 card with no stored payment: estimated minimum max(£25, 2.5%) = £38.
    const fig = selectMonthsOfCover(
      [row({ amount: 950 })],
      new PortfolioSnapshot([
        { id: "sav", name: "Saver", type: "Saving", balance: 4000 },
        { id: "cc", name: "Card", type: "Credit Card", balance: -1500 },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ monthlyEssentials: 988, months: 4 });
  });

  it("does not net an overdraft against savings", () => {
    const fig = selectMonthsOfCover(
      [row({ amount: 1000 })],
      new PortfolioSnapshot([
        { id: "cur", name: "Current", type: "Current", balance: -500 },
        { id: "sav", name: "Saver", type: "Saving", balance: 2000 },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.liquidCash).toBe(2000);
    expect(fig.value.months).toBe(2);
  });

  it("is unknown with no budget, and with no essentials (never infinite)", () => {
    const snap = new PortfolioSnapshot([{ id: "s", name: "S", type: "Saving", balance: 100 }]);
    expect(selectMonthsOfCover([], snap)).toEqual({
      status: "unknown",
      missing: ["budget"],
      reason: "not-set",
    });
    expect(selectMonthsOfCover([row({ amount: 50, isEssential: false })], snap)).toEqual({
      status: "unknown",
      missing: ["budgetEssentials"],
      reason: "not-set",
    });
  });

  it("is 0 months with essentials and no cash", () => {
    const fig = selectMonthsOfCover([row({ amount: 900 })], new PortfolioSnapshot([]));
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.months).toBe(0);
  });
});

describe("selectMonthsOfCover agrees with safe to spend on missing essentials", () => {
  it("is unknown with only debt minimums and £0 rows", () => {
    const snap = new PortfolioSnapshot([
      { id: "s", name: "S", type: "Saving", balance: 100 },
      { id: "c", name: "C", type: "Credit Card", balance: 900, monthlyContribution: 40 },
    ]);
    expect(selectMonthsOfCover([row({ amount: 0 })], snap)).toEqual({
      status: "unknown",
      missing: ["budgetEssentials"],
      reason: "not-set",
    });
  });
});

describe("monthsOfCoverFor", () => {
  it("rounds to one decimal place, the same way the saved figure does", () => {
    expect(monthsOfCoverFor(4200, 2800)).toBe(1.5);
    expect(monthsOfCoverFor(1000, 300)).toBe(3.3);
  });

  it("is null, never infinite, when nothing is paid each month", () => {
    expect(monthsOfCoverFor(4200, 0)).toBeNull();
    expect(monthsOfCoverFor(4200, -50)).toBeNull();
  });

  it("treats a negative pool as nothing to draw on", () => {
    expect(monthsOfCoverFor(-100, 500)).toBe(0);
  });
});

describe("selectMonthsOfCover: essential savings rows (owner item 28)", () => {
  const cash = new PortfolioSnapshot([{ id: "sav", name: "Saver", type: "Saving", balance: 4000 }]);

  it("covers an essential savings row with the essentials", () => {
    // Essentials £800 + essential savings £200 = £1,000 a month. 4,000 / 1,000 = 4.0 months.
    const fig = selectMonthsOfCover(
      [row({ amount: 800 }), row({ id: "s", category: "savings", amount: 200, isEssential: true })],
      cash,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 4, monthlyEssentials: 1000 });
  });

  it("leaves a savings row out while it is not essential (the default)", () => {
    // Essentials £800 only. 4,000 / 800 = 5.0 months.
    const fig = selectMonthsOfCover(
      [
        row({ amount: 800 }),
        row({ id: "s", category: "savings", amount: 200, isEssential: false }),
      ],
      cash,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 5, monthlyEssentials: 800 });
  });

  it("needs essential spending: an essential savings row alone leaves it unknown", () => {
    const fig = selectMonthsOfCover(
      [row({ id: "s", category: "savings", amount: 200, isEssential: true })],
      cash,
    );
    expect(fig.status).toBe("unknown");
  });
});

describe("a savings row left at the default (owner item 28, default off)", () => {
  it("changes neither the essentials nor the months of cover", () => {
    // Rent £1,000 (essential) and an "Emergency fund" savings row of £300 added without choosing
    // Essential, so it takes the default. Cash £4,000.
    // Essentials = 1,000 (the £300 saving is not in them); 4,000 / 1,000 = 4.0 months.
    // Were the saving counted it would be 4,000 / 1,300 = 3.1 months.
    const savings = row({
      id: "ef",
      category: "savings",
      name: "Emergency fund",
      amount: 300,
      isEssential: defaultIsEssential("savings"),
    });
    const budget = [row({ id: "rent", category: "housing", amount: 1000 }), savings];
    const snapshot = new PortfolioSnapshot([
      { id: "cur", name: "Current", type: "Current", balance: 4000 },
    ]);
    expect(savings.isEssential).toBe(false);
    expect(essentialCommitments(budget, snapshot)).toMatchObject({
      essentialsExcludingDebt: 1000,
      essentialSavings: 0,
      total: 1000,
    });
    const fig = selectMonthsOfCover(budget, snapshot);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value).toMatchObject({ months: 4, monthlyEssentials: 1000 });
  });

  it("defaults every other row to essential, and an income row too", () => {
    expect(defaultIsEssential("housing")).toBe(true);
    expect(defaultIsEssential("bills")).toBe(true);
    expect(defaultIsEssential("savings", true)).toBe(true);
  });
});
