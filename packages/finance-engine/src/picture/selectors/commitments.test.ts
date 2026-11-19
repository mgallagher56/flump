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
  it("counts joint essential and debt rows at the user's share (E34 C1)", () => {
    // Joint council tax £180 at 50% = £90; joint loan row £300 at 50% = £150, above the card's
    // £100 minimum, so the debt commitment is £150. Total 90 + 150 = £240.
    const c = essentialCommitments(
      [
        row({ amount: 180, ownership: "joint" }),
        row({ category: "debt", amount: 300, ownership: "joint" }),
      ],
      card(100),
    );
    expect(c.essentialsExcludingDebt).toBe(90);
    expect(c.budgetDebtPayments).toBe(150);
    expect(c.debtCommitment).toBe(150);
    expect(c.total).toBe(240);
  });

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

  it("does not mark a stored minimum as estimated", () => {
    // The card stores a £150 payment, so its minimum is that figure, not an estimate.
    const c = essentialCommitments([], card(150));
    expect(c.minimumsEstimated).toBe(false);
    expect(c.accountMinimums).toBe(150);
  });
});

describe("essentialCommitments: essential savings rows (owner item 28)", () => {
  it("keeps essential savings out of the total and reports them on their own", () => {
    // Essential bills £600, an essential savings row £200, a non-essential savings row £50.
    // essentialsExcludingDebt = 600 (savings are never in it), total = 600 + 0 debt = 600,
    // essentialSavings = 200 (the £50 row is not essential).
    const c = essentialCommitments(
      [
        row({ id: "b", amount: 600 }),
        row({ id: "s1", category: "savings", amount: 200, isEssential: true }),
        row({ id: "s2", category: "savings", amount: 50, isEssential: false }),
      ],
      new PortfolioSnapshot([]),
    );
    expect(c).toMatchObject({ essentialsExcludingDebt: 600, total: 600, essentialSavings: 200 });
  });
});
