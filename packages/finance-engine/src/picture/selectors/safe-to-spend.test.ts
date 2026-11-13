import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import { ESTIMATED_MINIMUMS_NOTE, selectSafeToSpend } from "./safe-to-spend.js";
import type { TakeHome } from "./take-home.js";

const takeHome = (monthly: number, assumptions?: string[]): Figure<TakeHome> =>
  figureKnown(
    {
      monthly,
      annual: monthly * 12,
      incomeTax: 0,
      nationalInsurance: 0,
      studentLoan: 0,
      pension: 0,
      taxYear: "2026/27",
      region: "ENGLAND_NI_WALES",
    },
    assumptions ? "assumption" : "derived",
    assumptions,
  );

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

const empty = new PortfolioSnapshot([]);

describe("selectSafeToSpend", () => {
  it("is take-home less essentials, debt minimums and planned savings, per week", () => {
    const fig = selectSafeToSpend(
      takeHome(2600),
      [
        // Budgeted income is not used: take-home is (decision D-6-A).
        row({ amount: 9999, isIncome: true, category: "income" }),
        row({ amount: 1000 }),
        row({ category: "savings", amount: 300 }),
        row({ amount: 50, isEssential: false }),
      ],
      new PortfolioSnapshot([
        {
          id: "loan",
          name: "Loan",
          type: "Loan",
          balance: 5000,
          interestRate: 9,
          monthlyContribution: 200,
        },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    // 2,600 - 1,000 - 200 - 300 = 1,100 a month; discretionary rows are what it is spent on.
    expect(fig.value.monthly).toBe(1100);
    expect(fig.value.weekly).toBe(Math.round((1100 / 4.333333) * 100) / 100);
    expect(fig.value.monthlyShortfall).toBe(0);
    expect(fig.value.plannedSavings).toBe(300);
  });

  it("reports a shortfall instead of a negative allowance", () => {
    const fig = selectSafeToSpend(takeHome(1000), [row({ amount: 1200 })], empty);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.value.weekly).toBe(0);
    expect(fig.value.monthlyShortfall).toBe(200);
  });

  it("is unknown when take-home is unknown, naming the missing facts", () => {
    const fig = selectSafeToSpend(
      figureUnknown(["annualSalary"], "not-set"),
      [row({ amount: 500 })],
      empty,
    );
    expect(fig).toEqual({ status: "unknown", missing: ["annualSalary"], reason: "not-set" });
  });

  it("is unknown with no budget or no essential rows", () => {
    expect(selectSafeToSpend(takeHome(2000), [], empty)).toEqual({
      status: "unknown",
      missing: ["budget"],
      reason: "not-set",
    });
    expect(
      selectSafeToSpend(takeHome(2000), [row({ amount: 40, isEssential: false })], empty),
    ).toEqual({ status: "unknown", missing: ["budgetEssentials"], reason: "not-set" });
  });

  it("carries take-home assumptions and estimated minimums", () => {
    const fig = selectSafeToSpend(
      takeHome(2000, ["Assuming no student loan."]),
      [row({ amount: 500 })],
      new PortfolioSnapshot([
        { id: "c", name: "Card", type: "Credit Card", balance: 3000, interestRate: null },
      ]),
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe("assumption");
    expect(fig.assumptions).toEqual(["Assuming no student loan.", ESTIMATED_MINIMUMS_NOTE]);
  });
});

describe("selectSafeToSpend with only £0 suggested rows", () => {
  it("is unknown, never take-home less debt presented as safe to spend", () => {
    expect(selectSafeToSpend(takeHome(2000), [row({ amount: 0 })], empty)).toEqual({
      status: "unknown",
      missing: ["budgetEssentials"],
      reason: "not-set",
    });
  });
});
