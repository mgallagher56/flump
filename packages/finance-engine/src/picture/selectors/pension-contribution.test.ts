import { describe, expect, it } from "vitest";
import { selectPensionContributionMonthly } from "./pension-contribution.js";

describe("selectPensionContributionMonthly", () => {
  it("is salary x percent / 100 / 12, to whole pounds", () => {
    // 45,000 x 5 / 100 = 2,250 a year; / 12 = 187.5, rounded to 188.
    expect(selectPensionContributionMonthly({ annualSalary: 45000, pensionPercent: 5 })).toBe(188);
    // 30,000 x 3 / 100 = 900 a year; / 12 = 75.
    expect(selectPensionContributionMonthly({ annualSalary: 30000, pensionPercent: 3 })).toBe(75);
  });

  it("is 0 for a saved 0%", () => {
    expect(selectPensionContributionMonthly({ annualSalary: 30000, pensionPercent: 0 })).toBe(0);
  });

  it("is null when the salary or the percentage is not set", () => {
    expect(selectPensionContributionMonthly({ annualSalary: null, pensionPercent: 5 })).toBeNull();
    expect(selectPensionContributionMonthly({ annualSalary: 0, pensionPercent: 5 })).toBeNull();
    expect(
      selectPensionContributionMonthly({ annualSalary: 30000, pensionPercent: null }),
    ).toBeNull();
  });
});
