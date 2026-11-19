import { describe, expect, it } from "vitest";
import { payeSalaryForTax } from "./paye-salary-for-tax.js";

describe("payeSalaryForTax: salaries that are not a real figure", () => {
  it("counts an infinite salary as none, not as PAYE pay", () => {
    // The rule passes a salary only when it is a finite number above 0 (the doc comment: an
    // unknown salary, "not a positive number", counts as none). Infinity is not finite, so 0.
    expect(
      payeSalaryForTax({ employmentType: "employed", annualSalary: Number.POSITIVE_INFINITY }),
    ).toBe(0);
  });

  it("counts a salary of exactly 0 as none", () => {
    expect(payeSalaryForTax({ employmentType: "employed", annualSalary: 0 })).toBe(0);
  });
});
