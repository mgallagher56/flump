import { describe, expect, it } from "vitest";
import { calculateEmployerNISavings } from "./uk-tax.js";
import {
  calculateWorkplacePensionContributions,
  contributionMonthlyFromPercent,
  contributionPercentFromMonthly,
  UK_QUALIFYING_EARNINGS_LOWER,
  UK_QUALIFYING_EARNINGS_UPPER,
  workplacePensionFromProfile,
  workplaceSalaryNotSet,
} from "./workplace-pension.js";

const base = {
  annualSalary: 50_000,
  employeePercent: 5,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
};

describe("calculateWorkplacePensionContributions", () => {
  it("takes the percentages of the whole salary by default", () => {
    const r = calculateWorkplacePensionContributions(base);
    expect(r.pensionableSalary).toBe(50_000);
    expect(r.monthlyEmployee).toBeCloseTo(208.333, 3);
    expect(r.monthlyEmployer).toBe(125);
    expect(r.monthlyEmployerNi).toBe(0);
    expect(r.monthlyTotal).toBeCloseTo(333.333, 3);
  });

  it("counts only pay inside the qualifying earnings band when asked", () => {
    const at = (annualSalary: number) =>
      calculateWorkplacePensionContributions({ ...base, annualSalary, useQualifyingEarnings: true })
        .pensionableSalary;
    expect(at(50_000)).toBe(50_000 - UK_QUALIFYING_EARNINGS_LOWER);
    expect(at(60_000)).toBe(UK_QUALIFYING_EARNINGS_UPPER - UK_QUALIFYING_EARNINGS_LOWER);
    expect(at(5_000)).toBe(0);
  });

  it("adds the employer's National Insurance only for salary sacrifice passed on", () => {
    const sacrifice = { ...base, isSalarySacrifice: true };
    expect(calculateWorkplacePensionContributions(sacrifice).monthlyEmployerNi).toBe(0);
    const passed = calculateWorkplacePensionContributions({ ...sacrifice, passEmployerNi: true });
    expect(passed.monthlyEmployerNi).toBeCloseTo(calculateEmployerNISavings(50_000, 2_500) / 12, 6);
    expect(passed.monthlyEmployer).toBeCloseTo(125 + passed.monthlyEmployerNi, 6);
  });

  it("treats a missing, negative or non-finite figure as nothing paid in", () => {
    const r = calculateWorkplacePensionContributions({
      annualSalary: Number.NaN,
      employeePercent: -2,
      employerPercent: 3,
    });
    expect(r.monthlyTotal).toBe(0);
  });
});

describe("workplacePensionFromProfile", () => {
  it("is null without a saved salary", () => {
    expect(workplacePensionFromProfile(null)).toBeNull();
    expect(workplacePensionFromProfile({ annualSalary: 0, pensionPercent: 5 })).toBeNull();
  });

  it("reads the saved rates and method, never a legacy salary sacrifice default", () => {
    expect(
      workplacePensionFromProfile({
        annualSalary: 40_000,
        pensionPercent: 6,
        pensionEmployerPercent: 4,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
    ).toEqual({
      annualSalary: 40_000,
      employeePercent: 6,
      employerPercent: 4,
      isSalarySacrifice: true,
      passEmployerNi: true,
    });
    // Slice 6: a stored 5% and 3% with salary sacrifice is the user's choice, kept as chosen.
    expect(
      workplacePensionFromProfile({
        annualSalary: 40_000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
    ).toEqual({
      annualSalary: 40_000,
      employeePercent: 5,
      employerPercent: 3,
      isSalarySacrifice: true,
      passEmployerNi: true,
    });
  });

  it("is null for a self-employed or other employment type, kept for employed or unanswered", () => {
    const saved = { annualSalary: 40_000, pensionPercent: 6, pensionEmployerPercent: 4 };
    expect(workplacePensionFromProfile({ ...saved, employmentType: "self-employed" })).toBeNull();
    expect(workplacePensionFromProfile({ ...saved, employmentType: "other" })).toBeNull();
    expect(workplacePensionFromProfile({ ...saved, employmentType: "employed" })).not.toBeNull();
    expect(workplacePensionFromProfile({ ...saved, employmentType: null })).not.toBeNull();
    expect(workplacePensionFromProfile(saved)).not.toBeNull();
  });

  it("names each rate that is not set, and only those (slice 6)", () => {
    const at = (pensionPercent: number | null, pensionEmployerPercent: number | null) =>
      workplacePensionFromProfile({ annualSalary: 40_000, pensionPercent, pensionEmployerPercent })
        ?.notSet;
    expect(at(5, 3)).toBeUndefined();
    expect(at(0, 0)).toBeUndefined();
    expect(at(null, 3)).toEqual(["pensionPercent"]);
    expect(at(5, null)).toEqual(["pensionEmployerPercent"]);
    expect(at(null, null)).toEqual(["pensionPercent", "pensionEmployerPercent"]);
  });

  it("leaves an unset rate out of the contributions, never a stand-in 5% or 3%", () => {
    // Salary 40,000, employee rate not set, employer 3%: you £0; employer 40,000 x 3% / 12 = £100.
    const input = workplacePensionFromProfile({
      annualSalary: 40_000,
      pensionPercent: null,
      pensionEmployerPercent: 3,
    });
    expect(input && calculateWorkplacePensionContributions(input)).toMatchObject({
      monthlyEmployee: 0,
      monthlyEmployer: 100,
      monthlyTotal: 100,
    });
  });
});

describe("contributionMonthlyFromPercent", () => {
  it("works out pounds a month from a percentage of the whole salary", () => {
    // £42,000 at 5%: 42,000 × 0.05 = £2,100 a year; ÷ 12 = £175 a month.
    expect(contributionMonthlyFromPercent(5, { annualSalary: 42_000 })).toBe(175);
  });

  it("honours the qualifying earnings basis", () => {
    // £30,000 at 5% on qualifying earnings: 30,000 − 6,240 = 23,760; × 0.05 = 1,188; ÷ 12 = £99.
    expect(
      contributionMonthlyFromPercent(5, { annualSalary: 30_000, useQualifyingEarnings: true }),
    ).toBeCloseTo(99, 10);
    // £60,000 is capped at the upper limit: 50,270 − 6,240 = 44,030; × 0.05 = 2,201.50; ÷ 12.
    expect(
      contributionMonthlyFromPercent(5, { annualSalary: 60_000, useQualifyingEarnings: true }),
    ).toBeCloseTo(2_201.5 / 12, 10);
    // £6,000 is under the lower limit: no pay counts, so 5% of it is £0.
    expect(
      contributionMonthlyFromPercent(5, { annualSalary: 6_000, useQualifyingEarnings: true }),
    ).toBe(0);
  });

  it("gives not known (null) without a salary, never 0", () => {
    expect(contributionMonthlyFromPercent(5, { annualSalary: null })).toBeNull();
    expect(contributionMonthlyFromPercent(5, { annualSalary: undefined })).toBeNull();
    expect(contributionMonthlyFromPercent(5, { annualSalary: 0 })).toBeNull();
    expect(contributionMonthlyFromPercent(null, { annualSalary: 42_000 })).toBeNull();
  });

  it("reads 0% as £0", () => {
    expect(contributionMonthlyFromPercent(0, { annualSalary: 42_000 })).toBe(0);
  });
});

describe("contributionPercentFromMonthly", () => {
  it("works out the percentage of the whole salary from pounds a month", () => {
    // £100 a month on £30,000: 100 × 12 = £1,200 a year; 1,200 ÷ 30,000 = 0.04 = 4%.
    expect(contributionPercentFromMonthly(100, { annualSalary: 30_000 })).toBe(4);
    // £175 a month on £42,000: 2,100 ÷ 42,000 = 5%.
    expect(contributionPercentFromMonthly(175, { annualSalary: 42_000 })).toBe(5);
  });

  it("rounds to four decimal places, what the profile stores", () => {
    // £101.10 a month on £30,000: 1,213.20 ÷ 30,000 = 0.04044 = 4.044%, kept as 4.044%.
    expect(contributionPercentFromMonthly(101.1, { annualSalary: 30_000 })).toBe(4.044);
    // £100 a month on £37,260: 1,200 ÷ 37,260 = 0.0322061... = 3.22061...%, stored as 3.2206%.
    expect(contributionPercentFromMonthly(100, { annualSalary: 37_260 })).toBe(3.2206);
  });

  it("round-trips pounds a month to the penny through the stored percentage", () => {
    // 3.2206% of £37,260 = £1,199.99556 a year; ÷ 12 = £99.9996 a month, £100.00 to the penny.
    // At two places it was 3.22%: 37,260 × 0.0322 ÷ 12 = £99.981, which misses the penny.
    const stored = contributionPercentFromMonthly(100, { annualSalary: 37_260 });
    const back = contributionMonthlyFromPercent(stored, { annualSalary: 37_260 }) ?? 0;
    expect(back).toBeCloseTo(99.9996, 4);
    expect(Math.round(back * 100) / 100).toBe(100);
    // £175 a month on £42,000: 2,100 ÷ 42,000 = 5.0000%; 42,000 × 5% ÷ 12 = £175.00 exactly.
    expect(contributionPercentFromMonthly(175, { annualSalary: 42_000 })).toBe(5);
    expect(contributionMonthlyFromPercent(5, { annualSalary: 42_000 })).toBe(175);
  });

  it("honours the qualifying earnings basis", () => {
    // £99 a month on £30,000 qualifying earnings: 1,188 ÷ 23,760 = 0.05 = 5%.
    expect(
      contributionPercentFromMonthly(99, { annualSalary: 30_000, useQualifyingEarnings: true }),
    ).toBe(5);
  });

  it("never turns pounds into a percentage without a salary", () => {
    expect(contributionPercentFromMonthly(100, { annualSalary: null })).toBeNull();
    expect(contributionPercentFromMonthly(100, { annualSalary: 0 })).toBeNull();
    expect(contributionPercentFromMonthly(null, { annualSalary: 30_000 })).toBeNull();
    // Under the qualifying earnings band no pay counts, so there is nothing to divide by.
    expect(
      contributionPercentFromMonthly(100, { annualSalary: 6_000, useQualifyingEarnings: true }),
    ).toBeNull();
  });
});

describe("workplaceSalaryNotSet", () => {
  // A saved pension rate with no salary: the pounds cannot be worked out, so the contribution is
  // left out of projections. Pages and tools say so instead of using a silent £0 (leftovers 1).
  it("is true when a rate is saved and no salary is", () => {
    expect(workplaceSalaryNotSet({ pensionPercent: 5, annualSalary: null })).toBe(true);
    expect(workplaceSalaryNotSet({ pensionEmployerPercent: 3, annualSalary: 0 })).toBe(true);
    // Your 0% with your employer's 3%: the employer's contribution is the one left out.
    expect(
      workplaceSalaryNotSet({
        pensionPercent: 0,
        pensionEmployerPercent: 3,
        employmentType: "employed",
      }),
    ).toBe(true);
  });

  it("is false with a salary, with no rate saved, or with no workplace scheme", () => {
    expect(workplaceSalaryNotSet({ pensionPercent: 5, annualSalary: 30000 })).toBe(false);
    expect(workplaceSalaryNotSet({ pensionPercent: null, pensionEmployerPercent: null })).toBe(
      false,
    );
    expect(workplaceSalaryNotSet({})).toBe(false);
    // Saved rates of 0% contribute nothing with or without a salary, so nothing is left out.
    expect(workplaceSalaryNotSet({ pensionPercent: 0, pensionEmployerPercent: 0 })).toBe(false);
    expect(workplaceSalaryNotSet(null)).toBe(false);
    for (const employmentType of ["self-employed", "other"] as const) {
      expect(workplaceSalaryNotSet({ pensionPercent: 5, employmentType })).toBe(false);
    }
  });
});
