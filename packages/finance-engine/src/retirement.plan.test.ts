import { describe, expect, it } from "vitest";
import {
  calculateEvenRealDrawdown,
  calculateRetirementPlan,
  calculateRetirementStatePension,
  projectRealPotBalance,
  resolveRetirementAssumptions,
  selectRetirementCountedSeries,
  statePensionAnnualAtAge,
} from "./retirement.js";

// Growth equal to inflation is a real rate of exactly 0: (1.02 ÷ 1.02) − 1 = 0, so pots and
// drawdown in the plan cases below are plain sums.
const flat = {
  growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
  inflationRate: 0.02,
  cashSavingsNominalRate: 0.02,
};

describe("Retirement assumptions", () => {
  it("has no cash savings rate when none is typed or the typed one is not a number", () => {
    expect(resolveRetirementAssumptions().cashSavingsNominalRate).toBeNull();
    expect(
      resolveRetirementAssumptions({ cashSavingsNominalRate: Number.NaN }).cashSavingsNominalRate,
    ).toBeNull();
    expect(
      resolveRetirementAssumptions({ cashSavingsNominalRate: 0.04 }).cashSavingsNominalRate,
    ).toBe(0.04);
  });
});

describe("Single pot projection in today's prices", () => {
  it("uses the typed inflation rate, and 2% when none is typed", () => {
    // 5% growth with 5% inflation is a real rate of 0, so £1,000 stays £1,000.
    const typed = projectRealPotBalance({
      initialBalance: 1_000,
      nominalRate: 0.05,
      inflationRate: 0.05,
      years: 2,
    });
    expect(typed.inflationAnnualRate).toBe(0.05);
    expect(typed.realAnnualRate).toBe(0);
    expect(typed.endBalance).toBe(1_000);

    const defaulted = projectRealPotBalance({ initialBalance: 1_000, nominalRate: 0.02, years: 2 });
    expect(defaulted.inflationAnnualRate).toBe(0.02);
    expect(defaulted.endBalance).toBe(1_000);
  });

  it("a pot with no contributions records £0 paid in at each year end", () => {
    const result = projectRealPotBalance({
      initialBalance: 1_000,
      nominalRate: 0.02,
      inflationRate: 0.02,
      years: 2,
    });
    expect(result.yearEndContributions).toEqual([0, 0]);
    expect(result.yearEndBalances).toEqual([1_000, 1_000]);
  });

  it("real growth is the end balance less the starting balance and what was paid in", () => {
    // Real rate 0: 1,000 + 12 × 100 = 2,200 at the end, 1,200 paid in, so no growth.
    const flatResult = projectRealPotBalance({
      initialBalance: 1_000,
      monthlyContribution: 100,
      nominalRate: 0.02,
      inflationRate: 0.02,
      years: 1,
    });
    expect(flatResult.endBalance).toBe(2_200);
    expect(flatResult.totalContributions).toBe(1_200);
    expect(flatResult.realGrowth).toBe(0);
  });

  it("a -100% real rate wipes the pot out without an error", () => {
    // (1 − 1) ÷ (1 + 0) − 1 = −1, so £1,000 is worth £0 after a year.
    const lump = projectRealPotBalance({
      initialBalance: 1_000,
      nominalRate: -1,
      inflationRate: 0,
      years: 1,
    });
    expect(lump.endBalance).toBe(0);
    expect(lump.yearEndBalances).toEqual([0]);

    // With £100 a month, each month wipes out the balance before the £100 goes in, so it ends
    // at £100. Real growth 100 − 1,000 − 1,200 = −2,100.
    const withContributions = projectRealPotBalance({
      initialBalance: 1_000,
      monthlyContribution: 100,
      nominalRate: -1,
      inflationRate: 0,
      years: 1,
    });
    expect(withContributions.endBalance).toBe(100);
    expect(withContributions.realGrowth).toBe(-2_100);
  });

  it("a 100% real rate compounds monthly at the twelfth root of 2", () => {
    // Monthly rate m = 2^(1/12) − 1 = 0.0594630944. £100 a month for 12 months grows to
    // 100 × ((1 + m)^12 − 1) ÷ m = 100 ÷ m = 1,681.72 (worked with bc).
    // toBeCloseTo to 1 decimal place because the hand working rounds m.
    const result = projectRealPotBalance({
      initialBalance: 0,
      monthlyContribution: 100,
      nominalRate: 1,
      inflationRate: 0,
      years: 1,
    });
    expect(result.endBalance).toBeCloseTo(1_681.72, 1);
  });
});

describe("Even real drawdown", () => {
  it("draws nothing from an empty or negative pot, or over no years", () => {
    expect(calculateEvenRealDrawdown(-100, 0, 10)).toBe(0);
    expect(calculateEvenRealDrawdown(1_000, 0, 0)).toBe(0);
  });

  it("falls back to an even split when the real rate is -100% or below", () => {
    // 1,000 ÷ 10 = 100 a year.
    expect(calculateEvenRealDrawdown(1_000, -1, 10)).toBe(100);
    expect(calculateEvenRealDrawdown(1_000, -1.5, 10)).toBe(100);
  });
});

describe("State Pension inputs", () => {
  it("leaves out a State Pension age that is zero, negative or not finite", () => {
    for (const statePensionAge of [0, -5, Number.POSITIVE_INFINITY, Number.NaN]) {
      const sp = calculateRetirementStatePension({ statePensionAge, taxYear: "2026/27" });
      expect(sp.statePensionAge).toBeNull();
    }
    expect(
      calculateRetirementStatePension({ statePensionAge: 67, taxYear: "2026/27" }).statePensionAge,
    ).toBe(67);
  });

  it("accepts a forecast of £0 as a forecast", () => {
    const sp = calculateRetirementStatePension({ annualForecastGbp: 0, taxYear: "2026/27" });
    expect(sp.source).toBe("forecast");
    expect(sp.annualAmountGbp).toBe(0);
  });

  it("ignores a negative or non-finite forecast", () => {
    for (const annualForecastGbp of [-100, Number.POSITIVE_INFINITY, Number.NaN]) {
      const sp = calculateRetirementStatePension({ annualForecastGbp, taxYear: "2026/27" });
      expect(sp.source).toBe("none");
      expect(sp.annualAmountGbp).toBe(0);
    }
  });

  it("has no source when neither a forecast nor a usable count of years is given", () => {
    expect(calculateRetirementStatePension({ taxYear: "2026/27" }).source).toBe("none");
    const nan = calculateRetirementStatePension({
      qualifyingYears: Number.NaN,
      taxYear: "2026/27",
    });
    expect(nan.source).toBe("none");
    expect(nan.annualAmountGbp).toBe(0);
  });

  it("pays a share from exactly 10 qualifying years and nothing at 9", () => {
    // 2026/27 full rate £241.30 a week. 10 of 35 years: 241.30 × 10 ÷ 35 = 68.94 a week;
    // 241.30 × 52 × 10 ÷ 35 = 12,547.60 × 10 ÷ 35 = 3,585.03 a year.
    const ten = calculateRetirementStatePension({ qualifyingYears: 10, taxYear: "2026/27" });
    expect(ten.weeklyAmountGbp).toBe(68.94);
    expect(ten.annualAmountGbp).toBe(3_585.03);

    const nine = calculateRetirementStatePension({ qualifyingYears: 9, taxYear: "2026/27" });
    expect(nine.source).toBe("qualifying-years");
    expect(nine.annualAmountGbp).toBe(0);
    expect(nine.qualifyingYearsUsed).toBe(9);
  });

  it("pays nothing in a year when no State Pension age is known", () => {
    expect(statePensionAnnualAtAge(70, { statePensionAge: null, annualAmountGbp: 10_000 })).toBe(0);
  });
});

describe("Retirement plan: age checks", () => {
  const plan = (currentAge: number, retirementAge: number, planToAge: number) => () =>
    calculateRetirementPlan({ currentAge, retirementAge, planToAge, accounts: [] });

  it("rejects a current age that is negative or not whole, and accepts 0", () => {
    expect(plan(-1, 65, 90)).toThrow(RangeError);
    expect(plan(40.5, 65, 90)).toThrow(RangeError);
    expect(plan(0, 65, 90)).not.toThrow();
  });

  it("rejects a retirement age before the current age or not whole", () => {
    expect(plan(40, 39, 90)).toThrow(RangeError);
    expect(plan(40, 65.5, 90)).toThrow(RangeError);
  });

  it("rejects a plan-to age equal to the retirement age", () => {
    expect(plan(40, 65, 65)).toThrow(RangeError);
  });
});

describe("Retirement plan: hand-worked cases", () => {
  it("adds every pot group into the total and the drawdown, in every growth case", () => {
    // Retire today, plan 10 years. Pots: pension 10,000, ISA 20,000, savings 40,000 = 70,000.
    // Drawdown at real 0: (10,000 + 20,000) ÷ 10 + 40,000 ÷ 10 = 3,000 + 4,000 = 7,000.
    // State Pension from 65: 7,000 + 5,000 = 12,000. Housing £250 a month = 3,000 a year,
    // so 12,000 − 3,000 = 9,000 after housing. Typed target 20,000 stays 20,000 (housing is
    // only added to a target built from budget lines): 12,000 − 20,000 = −8,000.
    const result = calculateRetirementPlan({
      currentAge: 65,
      retirementAge: 65,
      planToAge: 75,
      accounts: [
        { id: "p", type: "Pension", balanceGbp: 10_000 },
        { id: "i", type: "ISA", balanceGbp: 20_000 },
        { id: "s", type: "Savings", balanceGbp: 40_000 },
      ],
      statePension: { statePensionAge: 65, annualForecastGbp: 5_000 },
      housing: { override: { kind: "custom", monthlyAmountGbp: 250 } },
      target: 20_000,
      assumptions: flat,
    });
    const band = (value: number) => ({ lower: value, middle: value, higher: value });
    expect(result.projectedPotAtRetirementGbp).toEqual(band(70_000));
    expect(result.annualPotIncomeGbp).toEqual(band(7_000));
    expect(result.yearlySchedule[0]?.grossYearlyIncome).toEqual(band(12_000));
    expect(result.yearlySchedule[0]?.yearlyIncomeAfterHousing).toEqual(band(9_000));
    expect(result.yearlySchedule[0]?.yearOfRetirement).toBe(1);
    expect(result.yearlySchedule[1]?.yearOfRetirement).toBe(2);
    expect(result.targetYearlyIncome).toBe(20_000);
    expect(result.differenceYearly).toEqual(band(-8_000));
  });

  it("with no pots and no State Pension, the path to retirement is all zeros", () => {
    const result = calculateRetirementPlan({
      currentAge: 60,
      retirementAge: 62,
      planToAge: 70,
      accounts: [],
      assumptions: flat,
    });
    const zero = { lower: 0, middle: 0, higher: 0 };
    expect(result.statePension).toBeNull();
    expect(result.estimatedYearlyIncomeBeforeStatePensionAgeGbp).toBeNull();
    expect(result.estimatedYearlyIncomeFromStatePensionAgeGbp).toBeNull();
    expect(result.estimatedYearlyIncomeGbp).toEqual(zero);
    expect(result.accumulation).toEqual([
      { age: 60, yearIndex: 0, potGbp: zero, paidInGbp: 0 },
      { age: 61, yearIndex: 1, potGbp: zero, paidInGbp: 0 },
      { age: 62, yearIndex: 2, potGbp: zero, paidInGbp: 0 },
    ]);
  });

  it("grows savings and a counted current account at the cash rate, not the growth rates", () => {
    // Cash rate 2% with 2% inflation is real 0; growth rates are 5%, so they must not be used.
    // Savings: 10,000 + 24 × 100 = 12,400 (the saved 5% rate is overridden by the cash rate).
    // Current account counted by choice: 5,000 stays 5,000, in the savings group.
    // Savings group 17,400; drawdown 17,400 ÷ 10 = 1,740 a year in every case.
    // Paid in: 15,000 today, 16,200 after a year, 17,400 after two.
    const result = calculateRetirementPlan({
      currentAge: 60,
      retirementAge: 62,
      planToAge: 72,
      accounts: [
        {
          id: "s",
          type: "Savings",
          balanceGbp: 10_000,
          monthlyContributionGbp: 100,
          interestRatePct: 5,
        },
        { id: "c", type: "Current", balanceGbp: 5_000, countsTowardsRetirement: true },
      ],
      assumptions: {
        growthRates: { lower: 0.05, middle: 0.05, higher: 0.05 },
        inflationRate: 0.02,
        cashSavingsNominalRate: 0.02,
      },
    });
    expect(result.projectedPotByGroupGbp.savings).toBe(17_400);
    expect(result.projectedPotByGroupGbp.investments).toEqual({ lower: 0, middle: 0, higher: 0 });
    expect(result.annualPotIncomeGbp).toEqual({ lower: 1_740, middle: 1_740, higher: 1_740 });
    expect(result.accumulation.map((p) => p.paidInGbp)).toEqual([15_000, 16_200, 17_400]);
    expect(result.accumulation[1]?.potGbp).toEqual({
      lower: 16_200,
      middle: 16_200,
      higher: 16_200,
    });
  });

  it("uses each savings pot's own rate, or 0%, when no cash rate is typed", () => {
    // Inflation 0. A 0% saved rate (or none, or not a number) keeps 10,000 flat over 2 years.
    for (const interestRatePct of [undefined, Number.NaN, 0]) {
      const result = calculateRetirementPlan({
        currentAge: 60,
        retirementAge: 62,
        planToAge: 72,
        accounts: [{ id: "s", type: "Savings", balanceGbp: 10_000, interestRatePct }],
        assumptions: { inflationRate: 0 },
      });
      expect(result.projectedPotByGroupGbp.savings).toBe(10_000);
    }
  });

  it("counts extra monthly savings, and only pension accounts in the pension paid-in figure", () => {
    // Real 0 throughout. Pension £100 a month for 24 months = 2,400; ISA £50 = 1,200;
    // extra savings £100 = 2,400. Pension paid in each year: 100 × 12 = 1,200 (the ISA is not
    // a pension). Drawdown (2,400 + 1,200) ÷ 10 + 2,400 ÷ 10 = 360 + 240 = 600.
    // Paid in after year 1: 1,200 + 600 + 1,200 = 3,000; after year 2: 6,000.
    const result = calculateRetirementPlan({
      currentAge: 60,
      retirementAge: 62,
      planToAge: 72,
      accounts: [
        { id: "p", type: "Pension", balanceGbp: 0, monthlyContributionGbp: 100 },
        { id: "i", type: "ISA", balanceGbp: 0, monthlyContributionGbp: 50 },
      ],
      additionalMonthlySavingsContributionGbp: 100,
      assumptions: flat,
    });
    expect(result.pensionPaidInYearlyGbp).toBe(1_200);
    expect(result.projectedPotByGroupGbp.savings).toBe(2_400);
    expect(result.annualPotIncomeGbp.middle).toBe(600);
    expect(result.accumulation.map((p) => p.paidInGbp)).toEqual([0, 3_000, 6_000]);
  });

  it("passes the saved rent growth through and adds average housing to a budget target", () => {
    // Rent £1,000 a month from today at 10% real growth: 12,000 at 65, 12,000 × 1.1 = 13,200
    // at 66; average 12,600. Budget target £500 a month = 6,000 + 12,600 = 18,600.
    // No pots, so income after housing is 0 − 12,000 and 0 − 13,200.
    const result = calculateRetirementPlan({
      currentAge: 65,
      retirementAge: 65,
      planToAge: 67,
      accounts: [],
      housing: { housingStatus: "renting", monthlyHousingCostGbp: 1_000, realRentGrowthRate: 0.1 },
      target: {
        kind: "budget",
        lines: [{ category: "Food", monthlyAmount: 500, status: "continues" }],
      },
      assumptions: flat,
    });
    expect(result.housing.yearlySchedule.map((p) => p.annualCostGbp)).toEqual([12_000, 13_200]);
    expect(result.targetYearlyIncome).toBe(18_600);
    expect(result.yearlySchedule.map((p) => p.yearlyIncomeAfterHousing)).toEqual([
      { lower: -12_000, middle: -12_000, higher: -12_000 },
      { lower: -13_200, middle: -13_200, higher: -13_200 },
    ]);
  });
});

describe("Counted retirement series", () => {
  it("applies the saved share of a joint savings account", () => {
    // A joint savings account with a 30% share counts 10,000 × 0.3 = 3,000.
    const series = selectRetirementCountedSeries(
      [
        {
          id: "s1",
          name: "Joint saver",
          type: "Savings",
          balanceGbp: 10_000,
          ownership: "joint",
          sharePercent: 30,
        },
      ],
      [{ accountId: "s1", year: 2026, month: 9, value: 10_000 }],
    );
    expect(series.map((p) => p.totalCountedGbp)).toEqual([3_000]);
  });

  it("is empty when no account counts towards retirement", () => {
    const series = selectRetirementCountedSeries(
      [{ id: "c1", type: "Current", balanceGbp: 2_000 }],
      [{ accountId: "c1", year: 2026, month: 9, value: 2_000 }],
    );
    expect(series).toEqual([]);
  });
});
