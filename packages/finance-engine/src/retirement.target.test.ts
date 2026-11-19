import { describe, expect, it } from "vitest";
import {
  calculateTargetFromBudgetLines,
  isHousingBudgetLine,
  type RetirementBudgetTargetLine,
  resolveRetirementTarget,
} from "./retirement.js";

describe("Retirement target: housing lines", () => {
  it("treats a line flagged as housing as housing whatever its category", () => {
    expect(isHousingBudgetLine({ isHousing: true, category: "Food" })).toBe(true);
    expect(isHousingBudgetLine({ isHousing: true })).toBe(true);
  });

  it("is not housing when there is no flag and no category", () => {
    expect(isHousingBudgetLine({})).toBe(false);
  });

  it("reads housing, rent and mortgage categories in any case and with spaces", () => {
    expect(isHousingBudgetLine({ category: "housing" })).toBe(true);
    expect(isHousingBudgetLine({ category: " Rent " })).toBe(true);
    expect(isHousingBudgetLine({ category: "  MORTGAGE " })).toBe(true);
    expect(isHousingBudgetLine({ category: "Food" })).toBe(false);
  });
});

describe("Retirement target: built from budget lines", () => {
  it("reads amount and frequency when no monthly amount is saved", () => {
    // £1,200 a year is £1,200 ÷ 12 = £100 a month.
    // £50 with no frequency is read as £50 a month.
    // Total £150 a month, £150 × 12 = £1,800 a year.
    const result = calculateTargetFromBudgetLines([
      { category: "Insurance", amount: 1_200, frequency: "annual", status: "continues" },
      { category: "Food", amount: 50, status: "continues" },
    ]);
    expect(result.monthlyAmount).toBe(150);
    expect(result.yearlyAmount).toBe(1_800);
    expect(result.includedLineCount).toBe(2);
  });

  it("falls back to amount and frequency when the saved monthly amount is not a number", () => {
    // monthlyAmount NaN is ignored, so the £30 monthly amount is used.
    const result = calculateTargetFromBudgetLines([
      {
        category: "Food",
        monthlyAmount: Number.NaN,
        amount: 30,
        frequency: "monthly",
        status: "continues",
      },
    ]);
    expect(result.monthlyAmount).toBe(30);
  });

  it("leaves out a savings line whatever its case or spacing", () => {
    const result = calculateTargetFromBudgetLines([
      { category: " Savings ", monthlyAmount: 200, status: "continues" },
      { category: "Food", monthlyAmount: 100, status: "continues" },
    ]);
    // Only the £100 food line counts.
    expect(result.monthlyAmount).toBe(100);
    expect(result.includedLineCount).toBe(1);
  });

  it("adds nothing for a changed amount below zero but still counts the line", () => {
    const result = calculateTargetFromBudgetLines([
      { category: "Food", status: { kind: "changes", monthlyAmount: -50 } },
      { category: "Travel", monthlyAmount: 80, status: "continues" },
    ]);
    // −£50 is not added; the total is the £80 travel line.
    expect(result.monthlyAmount).toBe(80);
    expect(result.includedLineCount).toBe(2);
  });

  it("ignores a line whose saved status is missing or not recognised", () => {
    const lines = [
      { category: "Food", monthlyAmount: 100, status: null },
      { category: "Gifts", monthlyAmount: 40, status: { kind: "paused" } },
      { category: "Travel", monthlyAmount: 80, status: "continues" },
    ] as unknown as RetirementBudgetTargetLine[];
    const result = calculateTargetFromBudgetLines(lines);
    // Only the £80 travel line is read and counted.
    expect(result.monthlyAmount).toBe(80);
    expect(result.includedLineCount).toBe(1);
  });
});

describe("Retirement target: typed figure", () => {
  it("reads a typed yearly number as a typed target with a twelfth each month", () => {
    // £12,000 a year ÷ 12 = £1,000 a month.
    expect(resolveRetirementTarget(12_000)).toEqual({
      source: "typed",
      monthlyAmount: 1_000,
      yearlyAmount: 12_000,
      includedLineCount: 0,
      excludedHousingLineCount: 0,
    });
    expect(resolveRetirementTarget({ kind: "typed", yearlyAmount: 12_000 })).toEqual({
      source: "typed",
      monthlyAmount: 1_000,
      yearlyAmount: 12_000,
      includedLineCount: 0,
      excludedHousingLineCount: 0,
    });
  });

  it("accepts a typed target of £0", () => {
    expect(resolveRetirementTarget(0)?.yearlyAmount).toBe(0);
    expect(resolveRetirementTarget({ kind: "typed", yearlyAmount: 0 })?.yearlyAmount).toBe(0);
  });

  it("returns no target for a negative or non-finite typed figure", () => {
    expect(resolveRetirementTarget(-1)).toBeNull();
    expect(resolveRetirementTarget(Number.NaN)).toBeNull();
    expect(resolveRetirementTarget(Number.POSITIVE_INFINITY)).toBeNull();
    expect(resolveRetirementTarget({ kind: "typed", yearlyAmount: -1 })).toBeNull();
    expect(resolveRetirementTarget({ kind: "typed", yearlyAmount: Number.NaN })).toBeNull();
    expect(
      resolveRetirementTarget({ kind: "typed", yearlyAmount: Number.POSITIVE_INFINITY }),
    ).toBeNull();
  });
});
