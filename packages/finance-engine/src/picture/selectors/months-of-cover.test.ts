import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { isFigureKnown } from "../figure.js";
import { selectMonthsOfCover } from "./months-of-cover.js";

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
