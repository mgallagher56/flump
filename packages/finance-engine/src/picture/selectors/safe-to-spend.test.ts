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

/** The take-home line the engine resolves (`withLinkedBudgetRows`): its figure is the take-home. */
const takeHomeLine = (monthly: number): BudgetEntryItem =>
  row({
    id: "linked:take-home",
    category: "income",
    name: "Take-home pay",
    amount: monthly,
    isIncome: true,
    linked: "take_home",
  });

describe("selectSafeToSpend", () => {
  it("is income less essentials, debt minimums and planned savings, per week", () => {
    const fig = selectSafeToSpend(
      takeHome(2600),
      [
        takeHomeLine(2600),
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
    expect(fig.value.incomeMonthly).toBe(2600);
  });

  // Audit slice 5 (link L34): a typed income line is the person's own figure, and left over starts
  // from it, so safe to spend does too, even when the salary gives a different take-home.
  it("starts from the typed income lines, not the take-home worked out from salary", () => {
    const fig = selectSafeToSpend(
      takeHome(2600),
      [
        row({ amount: 2400, isIncome: true, category: "income" }),
        row({ amount: 300, isIncome: true, category: "income", ownership: "joint" }),
        row({ amount: 1000 }),
      ],
      empty,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    // Income: 2,400 + 300 joint at the default 50% = 2,400 + 150 = 2,550.
    // 2,550 - 1,000 essentials = 1,550 a month.
    expect(fig.value.incomeMonthly).toBe(2550);
    expect(fig.value.monthly).toBe(1550);
    // The take-home's assumptions are not in it: the take-home is not part of the income.
    expect(fig.provenance).toBe("derived");
  });

  it("is known from typed income when no salary is saved", () => {
    const fig = selectSafeToSpend(
      figureUnknown(["annualSalary"], "not-set"),
      [row({ amount: 1800, isIncome: true, category: "income" }), row({ amount: 500 })],
      empty,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    // 1,800 - 500 = 1,300 a month.
    expect(fig.value.monthly).toBe(1300);
  });

  it("reports a shortfall instead of a negative allowance", () => {
    const fig = selectSafeToSpend(
      takeHome(1000),
      [takeHomeLine(1000), row({ amount: 1200 })],
      empty,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    // 1,000 - 1,200 = -200: nothing to spend, 200 short.
    expect(fig.value.weekly).toBe(0);
    expect(fig.value.monthlyShortfall).toBe(200);
  });

  it("is unknown with no income in the budget, naming the missing facts", () => {
    const fig = selectSafeToSpend(
      figureUnknown(["annualSalary"], "not-set"),
      [row({ amount: 500 })],
      empty,
    );
    expect(fig).toEqual({
      status: "unknown",
      missing: ["annualSalary", "budgetIncome"],
      reason: "not-set",
    });
  });

  it("is unknown with no budget or no essential rows", () => {
    expect(selectSafeToSpend(takeHome(2000), [], empty)).toEqual({
      status: "unknown",
      missing: ["budget"],
      reason: "not-set",
    });
    expect(
      selectSafeToSpend(
        takeHome(2000),
        [takeHomeLine(2000), row({ amount: 40, isEssential: false })],
        empty,
      ),
    ).toEqual({ status: "unknown", missing: ["budgetEssentials"], reason: "not-set" });
  });

  it("carries take-home assumptions and estimated minimums", () => {
    const fig = selectSafeToSpend(
      takeHome(2000, ["Assuming no student loan."]),
      [takeHomeLine(2000), row({ amount: 500 })],
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
    expect(
      selectSafeToSpend(takeHome(2000), [takeHomeLine(2000), row({ amount: 0 })], empty),
    ).toEqual({
      status: "unknown",
      missing: ["budgetEssentials"],
      reason: "not-set",
    });
  });
});
