import { describe, expect, it } from "vitest";
import { categorizeAccountType, isLiabilityCategory } from "./account-category.js";

describe("categorizeAccountType", () => {
  it("puts a missing or empty type in other", () => {
    expect(categorizeAccountType(null)).toBe("other");
    expect(categorizeAccountType(undefined)).toBe("other");
    expect(categorizeAccountType("")).toBe("other");
  });

  it.each([
    ["Current", "cash"],
    ["checking", "cash"],
    ["Saving", "savings"],
    ["Savings", "savings"],
    ["Investment", "investments"],
    ["Investments", "investments"],
    ["ISA", "investments"],
    ["GIA", "investments"],
    ["Pension", "pensions"],
    ["Pensions", "pensions"],
    ["SIPP", "pensions"],
    ["Credit Card", "debt"],
    ["credit_card", "debt"],
    ["Loan", "debt"],
    ["Overdraft", "debt"],
    ["Property", "property"],
    ["Student Loan", "studentLoans"],
    ["student_loan", "studentLoans"],
    ["Mortgage", "mortgages"],
    ["Mortgages", "mortgages"],
  ] as const)("reads %s as %s", (type, category) => {
    expect(categorizeAccountType(type)).toBe(category);
  });

  it("ignores case and surrounding spaces", () => {
    expect(categorizeAccountType("  savings  ")).toBe("savings");
  });

  it("puts money owed to the user in other, never debt", () => {
    expect(categorizeAccountType("Owed")).toBe("other");
  });
});

describe("isLiabilityCategory", () => {
  it("is true only for debt and mortgages", () => {
    expect(isLiabilityCategory("debt")).toBe(true);
    expect(isLiabilityCategory("mortgages")).toBe(true);
    expect(isLiabilityCategory("studentLoans")).toBe(false);
    expect(isLiabilityCategory("savings")).toBe(false);
  });
});
