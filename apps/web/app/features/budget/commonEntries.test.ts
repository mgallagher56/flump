import { describe, expect, it } from "vitest";
import { hasCommonEntry, isSameCommonEntry, normaliseEntryName } from "./commonEntries";
import { exampleBudgetDrafts } from "./exampleDrafts";

describe("normaliseEntryName", () => {
  it("trims, lower-cases, reads / as or and & as and, and collapses spaces", () => {
    expect(normaliseEntryName("  Rent / Mortgage ")).toBe("rent or mortgage");
    expect(normaliseEntryName("Rent/Mortgage")).toBe("rent or mortgage");
    expect(normaliseEntryName("Gas & Electricity")).toBe("gas and electricity");
    expect(normaliseEntryName("Gas&Electricity")).toBe("gas and electricity");
    expect(normaliseEntryName("Council   Tax")).toBe("council tax");
  });
});

describe("isSameCommonEntry", () => {
  const same = (category: string, a: string, b: string) =>
    isSameCommonEntry({ category, name: a }, { category, name: b });

  it.each([
    ["housing", "Rent / Mortgage", "Rent or mortgage"],
    ["housing", "Rent", "Rent or mortgage"],
    ["housing", "Mortgage", "Rent or mortgage"],
    ["bills", "Gas & Electricity", "Energy"],
    ["bills", "Gas", "Energy"],
    ["bills", "Electricity", "Energy"],
    ["bills", "Broadband", "Phone and broadband"],
    ["bills", "Internet", "Phone and broadband"],
    ["expenses", "Groceries", "Food shop"],
    ["expenses", "Food", "Food shop"],
    ["bills", "Council Tax", "Council tax"],
    ["bills", "WATER", "Water"],
    ["savings", "Emergency fund", "Savings"],
    ["savings", "ISA / Investments", "Savings"],
    ["income", "Salary", "Take-home pay"],
    ["income", "Salary after tax", "Take-home pay"],
    ["income", "Wages", "Take-home pay"],
  ])("in %s, %s is the same entry as %s", (category, a, b) => {
    expect(same(category, a, b)).toBe(true);
  });

  it("needs the same category", () => {
    expect(
      isSameCommonEntry(
        { category: "expenses", name: "Rent" },
        { category: "housing", name: "Rent" },
      ),
    ).toBe(false);
  });

  it("does not match different groups or unknown names", () => {
    expect(same("bills", "Water", "Energy")).toBe(false);
    expect(same("bills", "Council tax", "Broadband")).toBe(false);
    expect(same("expenses", "Travel", "Food shop")).toBe(false);
    expect(same("expenses", "Travel", "travel")).toBe(true);
  });

  it("treats a flagged income entry as income whatever its category", () => {
    expect(
      isSameCommonEntry(
        { category: "side-work", name: "Salary", isIncome: true },
        { category: "income", name: "Take-home pay" },
      ),
    ).toBe(true);
  });
});

describe("common-entry drafts", () => {
  it("builds every common entry for an empty budget", () => {
    expect(exampleBudgetDrafts()).toHaveLength(8);
  });

  it("builds no duplicate draft for an old-seed budget of £0 rows", () => {
    const oldSeed = [
      { category: "housing", name: "Rent / Mortgage" },
      { category: "bills", name: "Gas" },
      { category: "bills", name: "Electricity" },
      { category: "bills", name: "Council Tax" },
      { category: "bills", name: "Broadband" },
    ];
    const drafts = exampleBudgetDrafts(oldSeed);
    expect(drafts.map((d) => d.name)).toEqual(["Take-home pay", "Food shop", "Travel", "Savings"]);
    for (const draft of drafts) expect(hasCommonEntry(oldSeed, draft)).toBe(false);
  });
});
