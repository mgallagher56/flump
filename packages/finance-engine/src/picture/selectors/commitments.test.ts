import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { essentialCommitments } from "./commitments.js";

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

const card = (monthlyContribution?: number) =>
  new PortfolioSnapshot([
    {
      id: "card",
      name: "Card",
      type: "Credit Card",
      balance: 2000,
      interestRate: 20,
      monthlyContribution,
    },
  ]);

describe("essentialCommitments", () => {
  it("counts a debt payment saved in both places once", () => {
    const c = essentialCommitments(
      [row({ amount: 800 }), row({ category: "debt", amount: 150 })],
      card(150),
    );
    expect(c.essentialsExcludingDebt).toBe(800);
    expect(c.debtCommitment).toBe(150);
    expect(c.total).toBe(950);
  });

  it("uses the larger of account minimums and budgeted debt payments", () => {
    expect(essentialCommitments([row({ category: "debt", amount: 90 })], card(150)).total).toBe(
      150,
    );
    expect(essentialCommitments([row({ category: "debt", amount: 300 })], card(150)).total).toBe(
      300,
    );
  });

  it("leaves out income, savings and discretionary rows", () => {
    const c = essentialCommitments(
      [
        row({ amount: 500, isIncome: true }),
        row({ category: "savings", amount: 200 }),
        row({ amount: 40, isEssential: false }),
        row({ amount: 600 }),
      ],
      new PortfolioSnapshot([]),
    );
    expect(c.total).toBe(600);
  });

  it("marks estimated account minimums", () => {
    const c = essentialCommitments([], card(undefined));
    expect(c.minimumsEstimated).toBe(true);
    expect(c.accountMinimums).toBeGreaterThan(0);
  });
});
