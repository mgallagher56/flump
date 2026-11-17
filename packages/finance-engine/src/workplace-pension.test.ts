import { describe, expect, it } from "vitest";
import { calculateEmployerNISavings } from "./uk-tax.js";
import {
  calculateWorkplacePensionContributions,
  UK_QUALIFYING_EARNINGS_LOWER,
  UK_QUALIFYING_EARNINGS_UPPER,
  workplacePensionFromProfile,
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
    // The untouched creation defaults (5% and 3%) never make a stored `true` a choice.
    expect(
      workplacePensionFromProfile({
        annualSalary: 40_000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
    ).toMatchObject({ isSalarySacrifice: false, passEmployerNi: false });
  });
});
