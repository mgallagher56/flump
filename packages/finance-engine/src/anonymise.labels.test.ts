import { describe, expect, it } from "vitest";
import {
  anonymousAccountType,
  builtInBudgetCategoryLabel,
  createNeutralLabeller,
  createTaxRecordAnonymiser,
} from "./anonymise.js";

describe("anonymousAccountType keeps every fixed type word", () => {
  // Each of these is on the fixed account type list, so it must come back as the list's own
  // spelling. If it fell through to "Other", the engine would count the account in the wrong
  // category and the anonymised totals would change.
  const cases: [string, string][] = [
    ["mortgage", "Mortgage"],
    ["OWED", "Owed"],
    ["investment", "Investment"],
    [" pension ", "Pension"],
    ["investments", "Investments"],
    ["Pensions", "Pensions"],
    ["debt", "Debt"],
  ];
  for (const [stored, expected] of cases) {
    it(`maps a stored "${stored}" to "${expected}"`, () => {
      expect(anonymousAccountType(stored)).toBe(expected);
    });
  }
});

describe("built-in budget category and tax source labels", () => {
  it("labels the expenses, income and lifestyle categories", () => {
    expect(builtInBudgetCategoryLabel("expenses")).toBe("Expenses");
    expect(builtInBudgetCategoryLabel("income")).toBe("Income");
    expect(builtInBudgetCategoryLabel("lifestyle")).toBe("Lifestyle");
  });

  it("labels PAYE and savings tax records by their source", () => {
    const label = createTaxRecordAnonymiser();
    // First record in each group, so each is number 1.
    expect(label({ source: "paye", name: "Day job" })).toBe("PAYE 1");
    expect(label({ source: "savings", name: "Bond interest" })).toBe("Savings 1");
  });
});

describe("createNeutralLabeller compares names by their words", () => {
  it("treats a missing name and a blank name as the same name", () => {
    const label = createNeutralLabeller();
    expect(label("Bills", null)).toBe("Bills 1");
    expect(label("Bills", undefined)).toBe("Bills 1");
    expect(label("Bills", "")).toBe("Bills 1");
    expect(label("Bills", "   ")).toBe("Bills 1");
  });

  it("treats a run of spaces as one space", () => {
    const label = createNeutralLabeller();
    expect(label("Bills", "Rent  money")).toBe("Bills 1");
    expect(label("Bills", "rent money")).toBe("Bills 1");
  });

  it("keeps the space between words, so joined-up words are a different name", () => {
    const label = createNeutralLabeller();
    expect(label("Bills", "rent money")).toBe("Bills 1");
    expect(label("Bills", "rentmoney")).toBe("Bills 2");
  });
});
