import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "./ai-context-pack.js";
import type { RawAccount } from "./portfolio.js";
import { buildRetirementPlanInput, retirementBudgetLines } from "./retirement-input.js";

const NOW = new Date("2026-11-17T12:00:00Z");

const entry = (over: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "e",
  category: "expenses",
  name: "Entry",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

const food = entry({ id: "food", name: "Food", amount: 300 });

describe("retirementBudgetLines", () => {
  it("leaves out income rows and housing rows that are not linked", () => {
    const lines = retirementBudgetLines(
      [
        entry({ id: "pay", category: "income", name: "Salary", amount: 2500, isIncome: true }),
        entry({ id: "rent", category: "housing", name: "Rent", amount: 900 }),
        entry({ id: "mortgage", category: "mortgage", name: "Mortgage", amount: 700 }),
        food,
      ],
      [],
    );
    expect(lines.map((l) => l.id)).toEqual(["food"]);
  });

  it("leaves out savings rows, whatever the case or spacing of the category", () => {
    const lines = retirementBudgetLines(
      [
        entry({ id: "sav", category: "savings", name: "Saving", amount: 200 }),
        entry({ id: "sav2", category: " Savings ", name: "Pot", amount: 100 }),
        food,
      ],
      [],
    );
    expect(lines.map((l) => l.id)).toEqual(["food"]);
  });

  it("leaves out a line linked to a savings account, even when filed under another category", () => {
    const accounts: RawAccount[] = [
      { id: "isa", name: "Stocks ISA", type: "ISA", balance: 5000, monthlyContribution: 250 },
    ];
    const lines = retirementBudgetLines(
      [entry({ id: "isa-line", name: "ISA", linkKind: "savings", linkAccountId: "isa" }), food],
      accounts,
    );
    expect(lines.map((l) => l.id)).toEqual(["food"]);
  });

  it("keeps a linked debt line as a spending line at the loan's payment", () => {
    // A sole loan: the £360 payment in full, keyed by the stored row's id.
    const accounts: RawAccount[] = [
      { id: "car", name: "Car loan", type: "Loan", balance: -6000, monthlyContribution: 360 },
    ];
    const lines = retirementBudgetLines(
      [
        entry({
          id: "repay",
          category: "debt",
          name: "Car loan",
          linkKind: "debt",
          linkAccountId: "car",
        }),
      ],
      accounts,
    );
    expect(lines).toEqual([
      {
        id: "repay",
        name: "Car loan",
        category: "debt",
        amount: 360,
        frequency: "monthly",
        isIncome: false,
      },
    ]);
  });
});

describe("buildRetirementPlanInput: target from budget lines", () => {
  const plan = {
    retirementAge: 65,
    planToAge: 85,
    target: { kind: "budget" as const, lineSettings: [] },
  };

  it("counts a line with no saved setting as continuing", () => {
    const result = buildRetirementPlanInput({
      plan,
      birthYear: 1981,
      now: NOW,
      accounts: [],
      budgetEntries: [food],
    });
    if (!result.ok) throw new Error("expected a built input");
    const target = result.input.target;
    if (typeof target !== "object" || target?.kind !== "budget")
      throw new Error("expected a budget target");
    expect(target.lines.map((l) => [l.id, l.status])).toEqual([["food", "continues"]]);
  });

  it("has no target when the budget has no line it can count", () => {
    const result = buildRetirementPlanInput({
      plan,
      birthYear: 1981,
      now: NOW,
      accounts: [],
      budgetEntries: [entry({ id: "sav", category: "savings", amount: 200 })],
    });
    if (!result.ok) throw new Error("expected a built input");
    expect(result.input.target).toBeNull();
  });
});
