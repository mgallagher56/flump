import { describe, expect, it } from "vitest";
import type { UserProfileData } from "./profile.js";
import {
  calculateWorkplacePensionContributions,
  contributionMonthlyFromPercent,
  contributionPercentFromMonthly,
  workplacePensionFromProfile,
} from "./workplace-pension.js";

describe("calculateWorkplacePensionContributions: figures that are not usable", () => {
  it("reads a negative employee rate as no contribution, keeping the employer's", () => {
    // Salary 50,000, your rate -2% (not usable, so 0%), employer 3%:
    // you 0; employer 50,000 x 3% = 1,500 a year, / 12 = 125 a month.
    const r = calculateWorkplacePensionContributions({
      annualSalary: 50_000,
      employeePercent: -2,
      employerPercent: 3,
    });
    expect(r.monthlyEmployee).toBe(0);
    expect(r.monthlyEmployer).toBe(125);
    expect(r.monthlyTotal).toBe(125);
  });

  it("reads an infinite salary as no salary", () => {
    const r = calculateWorkplacePensionContributions({
      annualSalary: Number.POSITIVE_INFINITY,
      employeePercent: 5,
      employerPercent: 3,
    });
    expect(r.pensionableSalary).toBe(0);
    expect(r.monthlyTotal).toBe(0);
  });
});

describe("calculateWorkplacePensionContributions: employer NI passed on, by tax year", () => {
  const sacrifice = {
    annualSalary: 50_000,
    employeePercent: 5,
    employerPercent: 3,
    isSalarySacrifice: true,
    passEmployerNi: true,
  };

  it("uses the tax year asked for: 2024/25 at 13.8% over 9,100", () => {
    // GOV.UK Rates and thresholds for employers 2024 to 2025: secondary threshold 175 a week
    // (9,100 a year), employer Class 1 rate 13.8%.
    // Sacrifice 50,000 x 5% = 2,500, all above 9,100 (50,000 - 9,100 = 40,900 >= 2,500).
    // Saving 2,500 x 13.8% = 345 a year, / 12 = 28.75 a month. Employer 125 + 28.75 = 153.75.
    const r = calculateWorkplacePensionContributions({ ...sacrifice, taxYear: "2024/25" });
    // toBeCloseTo: 0.138 and 0.03 are not exact in binary floating point.
    expect(r.monthlyEmployerNi).toBeCloseTo(28.75, 10);
    expect(r.monthlyEmployer).toBeCloseTo(153.75, 10);
  });

  it("uses the tax year asked for: 2026/27 at 15% over 5,000", () => {
    // GOV.UK Rates and thresholds for employers 2026 to 2027: secondary threshold 96 a week
    // (5,000 a year), employer Class 1 rate 15%.
    // Sacrifice 2,500, all above 5,000 (50,000 - 5,000 = 45,000 >= 2,500).
    // Saving 2,500 x 15% = 375 a year, / 12 = 31.25 a month.
    const r = calculateWorkplacePensionContributions({ ...sacrifice, taxYear: "2026/27" });
    expect(r.monthlyEmployerNi).toBeCloseTo(31.25, 10);
  });
});

describe("workplacePensionFromProfile: salary sacrifice and NI pass-on", () => {
  const saved = { annualSalary: 40_000, pensionPercent: 6, pensionEmployerPercent: 4 };

  it("keeps the net pay method as chosen, and passes no NI without salary sacrifice", () => {
    const r = workplacePensionFromProfile({
      ...saved,
      isSalarySacrifice: false,
      isSalarySacrificeEmployerNi: true,
    });
    expect(r?.isSalarySacrifice).toBe(false);
    expect(r?.passEmployerNi).toBe(false);
  });

  it("reads an unanswered method as not salary sacrifice", () => {
    const r = workplacePensionFromProfile(saved);
    expect(r?.isSalarySacrifice).toBe(false);
    expect(r?.passEmployerNi).toBe(false);
  });

  it("passes no NI on when the employer does not pass its saving on", () => {
    const r = workplacePensionFromProfile({
      ...saved,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: false,
    });
    expect(r?.isSalarySacrifice).toBe(true);
    expect(r?.passEmployerNi).toBe(false);
  });
});

describe("workplacePensionFromProfile: which stored rates count as set", () => {
  const withEmployeeRate = (pensionPercent: unknown) =>
    workplacePensionFromProfile({
      annualSalary: 40_000,
      pensionEmployerPercent: 3,
      pensionPercent: pensionPercent as UserProfileData["pensionPercent"],
    });

  it("counts an empty string as not set, and as no contribution", () => {
    const r = withEmployeeRate("");
    expect(r?.notSet).toEqual(["pensionPercent"]);
    expect(r?.employeePercent).toBe(0);
  });

  it("counts a negative rate as not set, and as no contribution", () => {
    const r = withEmployeeRate(-1);
    expect(r?.notSet).toEqual(["pensionPercent"]);
    expect(r?.employeePercent).toBe(0);
  });

  it("counts a numeric string as a saved rate", () => {
    const r = withEmployeeRate("6");
    expect(r?.notSet).toBeUndefined();
    expect(r?.employeePercent).toBe(6);
  });
});

describe("contribution conversions: values that are not usable", () => {
  it("gives not known (null) for a salary that is not a finite number", () => {
    expect(contributionMonthlyFromPercent(5, { annualSalary: Number.NaN })).toBeNull();
    expect(
      contributionMonthlyFromPercent(5, { annualSalary: Number.POSITIVE_INFINITY }),
    ).toBeNull();
    expect(contributionPercentFromMonthly(100, { annualSalary: Number.NaN })).toBeNull();
  });

  it("gives not known (null) for a negative percentage", () => {
    expect(contributionMonthlyFromPercent(-5, { annualSalary: 42_000 })).toBeNull();
  });

  it("reads £0 a month as 0%, and a negative amount as not known", () => {
    // 0 x 12 / 30,000 = 0%.
    expect(contributionPercentFromMonthly(0, { annualSalary: 30_000 })).toBe(0);
    expect(contributionPercentFromMonthly(-10, { annualSalary: 30_000 })).toBeNull();
  });
});
