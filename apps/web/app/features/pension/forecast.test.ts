import { describe, expect, it } from "vitest";
import { type ForecastInput, plsaTierFor, projectPension } from "./forecast";

const base: ForecastInput = {
  startingPot: 20000,
  salary: 50000,
  employeePercent: 5,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
  directMonthlyContrib: 50,
  extraMonthly: 0,
  growthRate: 0,
  horizonYears: 10,
  useQualifyingEarnings: false,
  adjustForInflation: false,
  includeStatePension: false,
};

describe("projectPension", () => {
  it("adds up every monthly payment with no growth", () => {
    const r = projectPension(base);
    // 5% of 50,000 = 208.33, 3% = 125, plus 50 direct.
    expect(r.totalMonthly).toBeCloseTo(208.333 + 125 + 50, 2);
    expect(r.finalBalance).toBe(Math.round(20000 + r.totalMonthly * 120));
    expect(r.totalGrowth).toBe(0);
    expect(r.chartData).toHaveLength(11);
    expect(r.chartData[0]).toMatchObject({ year: "Year 0", totalPot: 20000 });
  });

  it("an extra monthly payment adds to the pot and to your contributions", () => {
    const without = projectPension(base);
    const withExtra = projectPension({ ...base, extraMonthly: 100 });
    expect(withExtra.finalBalance - without.finalBalance).toBe(12000);
    expect(withExtra.totalEmployeeContribs - without.totalEmployeeContribs).toBe(12000);
    expect(withExtra.totalEmployerContribs).toBe(without.totalEmployerContribs);
  });

  it("qualifying earnings only counts pay inside the band", () => {
    const r = projectPension({ ...base, useQualifyingEarnings: true });
    expect(r.pensionableSalary).toBe(50000 - 6240);
    expect(
      projectPension({ ...base, salary: 60000, useQualifyingEarnings: true }).pensionableSalary,
    ).toBe(50270 - 6240);
    expect(
      projectPension({ ...base, salary: 5000, useQualifyingEarnings: true }).pensionableSalary,
    ).toBe(0);
  });

  it("inflation takes 2.5 points off growth but never goes below 0", () => {
    expect(
      projectPension({ ...base, growthRate: 5, adjustForInflation: true }).effectiveAnnualRate,
    ).toBe(2.5);
    expect(
      projectPension({ ...base, growthRate: 1, adjustForInflation: true }).effectiveAnnualRate,
    ).toBe(0);
  });

  it("income is a 4% drawdown, and the State Pension is only added when asked", () => {
    const off = projectPension({ ...base, growthRate: 5 });
    const on = projectPension({ ...base, growthRate: 5, includeStatePension: true });
    expect(off.annualRetirementIncome).toBe(Math.round(off.finalBalance * 0.04));
    expect(on.annualRetirementIncome - off.annualRetirementIncome).toBe(on.statePensionAnnual);
  });

  it("picks the PLSA tier from the monthly income", () => {
    expect(plsaTierFor(500)).toBe("below");
    expect(plsaTierFor(1200)).toBe("minimum");
    expect(plsaTierFor(2608)).toBe("moderate");
    expect(plsaTierFor(3591)).toBe("comfortable");
  });
});
