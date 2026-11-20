import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findAdviceHits } from "./compliance/advice-lexicon.js";
import {
  calculateEvenRealDrawdown,
  calculateRealRate,
  calculateRetirementPlan,
  calculateRetirementStatePension,
  calculateTargetFromBudgetLines,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  defaultCountsTowardsRetirement,
  doesAccountCountTowardsRetirement,
  projectRealPotBalance,
  resolveRetirementAssumptions,
  resolveRetirementHousing,
  resolveRetirementTarget,
  selectRetirementCountedSeries,
  statePensionAnnualAtAge,
} from "./retirement.js";
import { roundPence } from "./uk-tax-year.js";

describe("E33 Retirement Plan Engine (S0-S1)", () => {
  describe("Test vectors RV1 to RV9 (docs/audit/plans/E33-retirement-plan.md)", () => {
    it("RV1: Full new State Pension, 2026/27 is £241.30 * 52 = £12,547.60 a year", () => {
      const sp = calculateRetirementStatePension({
        qualifyingYears: 35,
        taxYear: "2026/27",
      });
      expect(sp.source).toBe("qualifying-years");
      expect(sp.weeklyAmountGbp).toBe(241.3);
      expect(sp.annualAmountGbp).toBe(12547.6);
      expect(sp.qualifyingYearsUsed).toBe(35);
    });

    it("RV2: 28 of 35 qualifying years in 2026/27 gives £193.04 a week (£10,038.08 a year)", () => {
      const sp = calculateRetirementStatePension({
        qualifyingYears: 28,
        taxYear: "2026/27",
      });
      expect(sp.weeklyAmountGbp).toBe(193.04);
      expect(sp.annualAmountGbp).toBe(10038.08);
      expect(sp.qualifyingYearsUsed).toBe(28);
    });

    it("RV3: Real growth of £50,000 over 20 years at 5% nominal and 2% inflation with no contributions is £89,280 to the nearest pound", () => {
      const result = projectRealPotBalance({
        initialBalance: 50_000,
        monthlyContribution: 0,
        nominalRate: 0.05,
        inflationRate: 0.02,
        years: 20,
      });
      expect(result.realAnnualRate).toBeCloseTo((1 + 0.05) / (1 + 0.02) - 1, 10);
      expect(result.endBalanceRounded).toBe(89_280);
      expect(result.endBalance).toBe(89_279.66);
      expect(result.totalContributions).toBe(0);
    });

    it("RV4: Mortgage with 15 years left and retirement in 20 years ends before retirement (£0 in retirement)", () => {
      const housing = resolveRetirementHousing({
        currentAge: 45,
        retirementAge: 65,
        planToAge: 90,
        housingStatus: "mortgage",
        mortgage: {
          balanceGbp: 180_000,
          interestRateApr: 4.5,
          remainingTermMonths: 15 * 12,
        },
      });
      expect(housing.kind).toBe("mortgage-ends-before-retirement");
      expect(housing.mortgageEndAge).toBe(60);
      expect(housing.mortgageEndAge).toBeLessThan(65);
      expect(housing.mortgageYearsInRetirement).toBe(0);
      expect(housing.monthlyCostAtRetirementGbp).toBe(0);
      expect(housing.annualCostAtRetirementGbp).toBe(0);
      expect(housing.averageAnnualCostGbp).toBe(0);
      expect(housing.totalRetirementHousingCostGbp).toBe(0);
      expect(housing.yearlySchedule.every((pt) => pt.annualCostGbp === 0)).toBe(true);
    });

    it("RV5: Mortgage with 25 years left and retirement in 20 years continues for 5 years of retirement, then £0", () => {
      const housing = resolveRetirementHousing({
        currentAge: 45,
        retirementAge: 65,
        planToAge: 90,
        housingStatus: "mortgage",
        mortgage: {
          balanceGbp: 200_000,
          interestRateApr: 4.0,
          remainingTermMonths: 25 * 12,
          monthlyPaymentGbp: 1_055.67,
        },
      });
      expect(housing.kind).toBe("mortgage-continues");
      expect(housing.mortgageEndAge).toBe(70);
      expect(housing.mortgageYearsInRetirement).toBe(5);

      // A fixed £1,055.67 a month falls in today's prices at 2% inflation. Retirement year i
      // (0-based) is 20 + i years away, so its cost is 1,055.67 × 12 ÷ 1.02^(20 + i):
      //   i = 0: 12,668.04 ÷ 1.485947 = 8,525.23
      //   i = 1: 12,668.04 ÷ 1.515666 = 8,358.07
      //   i = 2: 12,668.04 ÷ 1.545980 = 8,194.18
      //   i = 3: 12,668.04 ÷ 1.576899 = 8,033.51
      //   i = 4: 12,668.04 ÷ 1.608437 = 7,875.99
      // Monthly at the start of retirement: 1,055.67 ÷ 1.485947 = 710.44.
      // Total 40,986.98; average over 25 years 40,986.98 ÷ 25 = 1,639.48.
      expect(housing.monthlyCostAtRetirementGbp).toBe(710.44);
      expect(housing.annualCostAtRetirementGbp).toBe(8_525.23);
      expect(housing.yearlySchedule.slice(0, 5).map((p) => p.annualCostGbp)).toEqual([
        8_525.23, 8_358.07, 8_194.18, 8_033.51, 7_875.99,
      ]);
      for (let i = 5; i < 25; i++) {
        expect(housing.yearlySchedule[i]?.annualCostGbp).toBe(0);
      }
      expect(housing.totalRetirementHousingCostGbp).toBe(40_986.98);
      expect(housing.averageAnnualCostGbp).toBe(1_639.48);
    });

    it("RV5 override: a typed continuing mortgage payment also falls in today's prices", () => {
      // Override: £1,000 a month for 2 years of retirement, retiring in 10 years at 2% inflation.
      //   year 0: 12,000 ÷ 1.02^10 = 12,000 ÷ 1.218994 = 9,844.18
      //   year 1: 12,000 ÷ 1.02^11 = 12,000 ÷ 1.243374 = 9,651.16
      const housing = resolveRetirementHousing({
        currentAge: 50,
        retirementAge: 60,
        planToAge: 70,
        inflationRate: 0.02,
        override: {
          kind: "mortgage-continues",
          monthlyPaymentGbp: 1_000,
          remainingYearsInRetirement: 2,
        },
      });
      expect(housing.yearlySchedule.slice(0, 3).map((p) => p.annualCostGbp)).toEqual([
        9_844.18, 9_651.16, 0,
      ]);
    });

    it("RV6: Renting with rent growth equal to inflation stays constant in today's money for every retirement year", () => {
      const housing = resolveRetirementHousing({
        currentAge: 35,
        retirementAge: 67,
        planToAge: 92,
        housingStatus: "renting",
        monthlyHousingCostGbp: 1_250,
        realRentGrowthRate: 0,
      });
      expect(housing.kind).toBe("rent-for-life");
      expect(housing.monthlyCostAtRetirementGbp).toBe(1_250);
      expect(housing.annualCostAtRetirementGbp).toBe(15_000);
      expect(housing.averageAnnualCostGbp).toBe(15_000);
      expect(housing.yearlySchedule).toHaveLength(25);
      for (const yearPoint of housing.yearlySchedule) {
        expect(yearPoint.annualCostGbp).toBe(15_000);
      }
    });

    it("RV7: State Pension starts at the age the user typed (0 before that age, full yearly amount from it)", () => {
      const sp = calculateRetirementStatePension({
        statePensionAge: 68,
        qualifyingYears: 35,
        taxYear: "2026/27",
      });
      expect(sp.statePensionAge).toBe(68);
      for (let age = 55; age < 68; age++) {
        expect(statePensionAnnualAtAge(age, sp)).toBe(0);
      }
      for (let age = 68; age <= 95; age++) {
        expect(statePensionAnnualAtAge(age, sp)).toBe(12_547.6);
      }
    });

    it("RV8: Target from budget sums continuing and changed lines * 12 and excludes stopped and housing lines", () => {
      const target = calculateTargetFromBudgetLines([
        { id: "1", name: "Groceries", category: "food", monthlyAmount: 450, status: "continues" },
        { id: "2", name: "Commuting", category: "transport", monthlyAmount: 220, status: "stops" },
        {
          id: "3",
          name: "Leisure",
          category: "lifestyle",
          monthlyAmount: 300,
          status: { kind: "changes", monthlyAmount: 400 },
        },
        {
          id: "4",
          name: "Rent",
          category: "housing",
          monthlyAmount: 1_200,
          status: "continues",
        },
        {
          id: "5",
          name: "Salary",
          category: "income",
          monthlyAmount: 3_500,
          isIncome: true,
          status: "continues",
        },
      ]);

      expect(target.source).toBe("budget");
      expect(target.includedLineCount).toBe(3);
      expect(target.excludedHousingLineCount).toBe(1);
      expect(target.monthlyAmount).toBe(850); // 450 + 0 + 400
      expect(target.yearlyAmount).toBe(10_200); // 850 * 12
    });

    it("RV9: Counted series with one carried-forward month flags the carried value and computes deltas", () => {
      const accounts = [
        { id: "pen-1", name: "Workplace Pension", type: "Pension", balanceGbp: 42_000 },
        { id: "isa-1", name: "Stocks ISA", type: "ISA", balanceGbp: 18_000 },
        { id: "cur-1", name: "Current Account", type: "Current", balanceGbp: 2_500 },
      ];
      const rows = [
        { accountId: "pen-1", year: 2026, month: 9, value: 40_000 },
        { accountId: "isa-1", year: 2026, month: 9, value: 15_000 },
        { accountId: "cur-1", year: 2026, month: 9, value: 2_000 },
        // October 2026: pen-1 updated, isa-1 missing (carried forward from September)
        { accountId: "pen-1", year: 2026, month: 10, value: 41_200 },
        // November 2026: both updated
        { accountId: "pen-1", year: 2026, month: 11, value: 42_000 },
        { accountId: "isa-1", year: 2026, month: 11, value: 18_000 },
      ];

      const series = selectRetirementCountedSeries(accounts, rows);
      expect(series).toHaveLength(3);

      // Current account is excluded because defaultCountsTowardsRetirement("Current") is false
      expect(series[0]).toEqual({
        month: "2026-09",
        totalCountedGbp: 55_000,
        hasCarriedForward: false,
        allCarried: false,
        accounts: [
          { accountId: "isa-1", value: 15_000, carried: false },
          { accountId: "pen-1", value: 40_000, carried: false },
        ],
        changeFromPreviousGbp: null,
      });

      expect(series[1]).toEqual({
        month: "2026-10",
        totalCountedGbp: 56_200,
        hasCarriedForward: true,
        allCarried: false,
        accounts: [
          { accountId: "isa-1", value: 15_000, carried: true },
          { accountId: "pen-1", value: 41_200, carried: false },
        ],
        changeFromPreviousGbp: 1_200,
      });

      expect(series[2]).toEqual({
        month: "2026-11",
        totalCountedGbp: 60_000,
        hasCarriedForward: false,
        allCarried: false,
        accounts: [
          { accountId: "isa-1", value: 18_000, carried: false },
          { accountId: "pen-1", value: 42_000, carried: false },
        ],
        changeFromPreviousGbp: 3_800,
      });
    });
  });

  describe("Real rate, assumptions and account eligibility", () => {
    it("uses 2%, 5%, 8% nominal growth and 2% inflation by default and supports caller overrides", () => {
      const defaults = resolveRetirementAssumptions();
      expect(defaults.growthRates).toEqual(DEFAULT_RETIREMENT_GROWTH_CASES);
      expect(defaults.inflationRate).toBe(DEFAULT_RETIREMENT_INFLATION_RATE);
      expect(defaults.realGrowthRates.lower).toBeCloseTo(0, 10);
      expect(defaults.realGrowthRates.middle).toBeCloseTo(1.05 / 1.02 - 1, 10);
      expect(defaults.realGrowthRates.higher).toBeCloseTo(1.08 / 1.02 - 1, 10);

      const custom = resolveRetirementAssumptions({
        growthRates: { lower: 0.03, middle: 0.06, higher: 0.09 },
        inflationRate: 0.025,
        cashSavingsNominalRate: 0.04,
        realRentGrowthRate: 0.01,
      });
      expect(custom.growthRates).toEqual({ lower: 0.03, middle: 0.06, higher: 0.09 });
      expect(custom.inflationRate).toBe(0.025);
      expect(custom.cashSavingsNominalRate).toBe(0.04);
      expect(custom.realRentGrowthRate).toBe(0.01);
    });

    it("rejects non-finite rates or inflation <= -100%", () => {
      expect(() => calculateRealRate(Number.NaN, 0.02)).toThrow(RangeError);
      expect(() => calculateRealRate(0.05, -1)).toThrow(RangeError);
      expect(() => calculateRealRate(0.05, -1.5)).toThrow(RangeError);
    });

    it("defaults countsTowardsRetirement by category and respects user overrides on asset accounts", () => {
      expect(defaultCountsTowardsRetirement("Pension")).toBe(true);
      expect(defaultCountsTowardsRetirement("SIPP")).toBe(true);
      expect(defaultCountsTowardsRetirement("ISA")).toBe(true);
      expect(defaultCountsTowardsRetirement("Investment")).toBe(true);
      expect(defaultCountsTowardsRetirement("Saving")).toBe(true);
      expect(defaultCountsTowardsRetirement("Current")).toBe(false);
      expect(defaultCountsTowardsRetirement("Property")).toBe(false);
      expect(defaultCountsTowardsRetirement("Mortgage")).toBe(false);
      expect(defaultCountsTowardsRetirement("Credit Card")).toBe(false);
      expect(defaultCountsTowardsRetirement("Student Loan")).toBe(false);

      // User can opt a current account in or a savings account out
      expect(
        doesAccountCountTowardsRetirement({ type: "Current", countsTowardsRetirement: true }),
      ).toBe(true);
      expect(
        doesAccountCountTowardsRetirement({ type: "Saving", countsTowardsRetirement: false }),
      ).toBe(false);
      // Liabilities never count as retirement pots even if flagged true
      expect(
        doesAccountCountTowardsRetirement({ type: "Mortgage", countsTowardsRetirement: true }),
      ).toBe(false);
      expect(
        doesAccountCountTowardsRetirement({ type: "Student Loan", countsTowardsRetirement: true }),
      ).toBe(false);
    });

    it("never counts property, even with an explicit true (decision RD8)", () => {
      expect(
        doesAccountCountTowardsRetirement({ type: "Property", countsTowardsRetirement: true }),
      ).toBe(false);
      expect(doesAccountCountTowardsRetirement({ type: "Property" })).toBe(false);
    });
  });

  describe("State Pension edge cases", () => {
    it("returns £0 below 10 qualifying years and caps at 35 qualifying years", () => {
      const nineYears = calculateRetirementStatePension({
        qualifyingYears: 9,
        taxYear: "2026/27",
      });
      expect(nineYears.annualAmountGbp).toBe(0);
      expect(nineYears.weeklyAmountGbp).toBe(0);
      expect(nineYears.qualifyingYearsUsed).toBe(9);

      const fortyYears = calculateRetirementStatePension({
        qualifyingYears: 40,
        taxYear: "2026/27",
      });
      expect(fortyYears.annualAmountGbp).toBe(12_547.6);
      expect(fortyYears.qualifyingYearsUsed).toBe(35);
    });

    it("prefers user-entered annualForecastGbp when provided", () => {
      const forecast = calculateRetirementStatePension({
        annualForecastGbp: 11_200,
        qualifyingYears: 20,
        statePensionAge: 67,
        taxYear: "2026/27",
      });
      expect(forecast.source).toBe("forecast");
      expect(forecast.annualAmountGbp).toBe(11_200);
      expect(forecast.weeklyAmountGbp).toBe(roundPence(11_200 / 52));
      expect(forecast.qualifyingYearsUsed).toBeNull();
    });
  });

  describe("Housing cases and overrides", () => {
    it("supports own-outright, custom/living_with_family, and explicit overrides", () => {
      const ownOutright = resolveRetirementHousing({
        currentAge: 40,
        retirementAge: 65,
        planToAge: 90,
        housingStatus: "own_outright",
      });
      expect(ownOutright.kind).toBe("own-outright");
      expect(ownOutright.annualCostAtRetirementGbp).toBe(0);

      const family = resolveRetirementHousing({
        currentAge: 30,
        retirementAge: 65,
        planToAge: 90,
        housingStatus: "living_with_family",
        monthlyHousingCostGbp: 300,
      });
      expect(family.kind).toBe("custom");
      expect(family.annualCostAtRetirementGbp).toBe(3_600);

      const overriddenToRent = resolveRetirementHousing({
        currentAge: 30,
        retirementAge: 65,
        planToAge: 85,
        housingStatus: "living_with_family",
        monthlyHousingCostGbp: 200,
        override: { kind: "rent-for-life", monthlyRentGbp: 1_100, realRentGrowthRate: 0 },
      });
      expect(overriddenToRent.kind).toBe("rent-for-life");
      expect(overriddenToRent.overridden).toBe(true);
      expect(overriddenToRent.annualCostAtRetirementGbp).toBe(13_200);
    });

    it("infers remaining mortgage months from balance, rate, and monthly payment when termMonths is omitted", () => {
      const housing = resolveRetirementHousing({
        currentAge: 50,
        retirementAge: 60,
        planToAge: 85,
        housingStatus: "mortgage",
        mortgage: {
          balanceGbp: 150_000,
          interestRateApr: 4.5,
          monthlyPaymentGbp: 950,
        },
      });
      expect(housing.kind).toBe("mortgage-continues");
      expect(housing.mortgageYearsInRetirement).toBeGreaterThan(5);
      // £950 × 12 = 11,400 in pounds of the day; 10 years away at 2%: 11,400 ÷ 1.218994 = 9,351.97.
      expect(housing.annualCostAtRetirementGbp).toBe(9_351.97);
    });
  });

  describe("Hand-computed plan cases", () => {
    // 2% growth with 2% inflation is a real rate of exactly 0, so pots and drawdown are plain sums.
    const flatGrowth = {
      growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
      inflationRate: 0.02,
      cashSavingsNominalRate: 0.02,
    };

    it("retiring before State Pension age: pots only until then, State Pension added from it", () => {
      // Pot £100,000 at 60, plan to 80: 100,000 ÷ 20 = £5,000 a year from pots.
      // State Pension forecast £11,000 a year from 67: 5,000 + 11,000 = £16,000 from 67.
      // Target £20,000: difference 5,000 − 20,000 = −15,000 before 67; 16,000 − 20,000 = −4,000 from 67.
      const plan = calculateRetirementPlan({
        currentAge: 60,
        retirementAge: 60,
        planToAge: 80,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 100_000 }],
        target: 20_000,
        statePension: { statePensionAge: 67, annualForecastGbp: 11_000 },
        assumptions: flatGrowth,
      });
      expect(plan.estimatedYearlyIncomeBeforeStatePensionAgeGbp).toEqual({
        lower: 5_000,
        middle: 5_000,
        higher: 5_000,
      });
      expect(plan.estimatedYearlyIncomeFromStatePensionAgeGbp).toEqual({
        lower: 16_000,
        middle: 16_000,
        higher: 16_000,
      });
      // The headline is the income from the retirement age, never an average across years.
      expect(plan.estimatedYearlyIncomeGbp.middle).toBe(5_000);
      expect(plan.differenceBeforeStatePensionAgeYearly?.middle).toBe(-15_000);
      expect(plan.differenceFromStatePensionAgeYearly?.middle).toBe(-4_000);
      expect(plan.differenceYearly?.middle).toBe(-15_000);
      expect(plan.yearlySchedule[6]?.statePensionYearlyGbp).toBe(0); // age 66
      expect(plan.yearlySchedule[7]?.statePensionYearlyGbp).toBe(11_000); // age 67
    });

    it("retiring at or after State Pension age has no separate before figure", () => {
      const plan = calculateRetirementPlan({
        currentAge: 67,
        retirementAge: 67,
        planToAge: 87,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 100_000 }],
        statePension: { statePensionAge: 67, annualForecastGbp: 11_000 },
        assumptions: flatGrowth,
      });
      // 100,000 ÷ 20 = 5,000; plus 11,000 = 16,000.
      expect(plan.estimatedYearlyIncomeBeforeStatePensionAgeGbp).toBeNull();
      expect(plan.estimatedYearlyIncomeGbp.middle).toBe(16_000);
    });

    it("leaves State Pension out when no age or no amount source is given", () => {
      const noAge = calculateRetirementPlan({
        currentAge: 60,
        retirementAge: 60,
        planToAge: 80,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 100_000 }],
        statePension: { annualForecastGbp: 11_000 },
        assumptions: flatGrowth,
      });
      expect(noAge.statePension).toBeNull();
      expect(noAge.estimatedYearlyIncomeFromStatePensionAgeGbp).toBeNull();
      expect(noAge.estimatedYearlyIncomeGbp.middle).toBe(5_000);

      const noAmount = calculateRetirementPlan({
        currentAge: 60,
        retirementAge: 60,
        planToAge: 80,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 100_000 }],
        statePension: { statePensionAge: 67 },
        assumptions: flatGrowth,
      });
      expect(noAmount.statePension).toBeNull();
      expect(noAmount.estimatedYearlyIncomeGbp.middle).toBe(5_000);
    });

    it("renter for life: rent stays at £12,000 a year in today's prices and comes off income", () => {
      // Pot £50,000 at real 0% for 25 years stays £50,000; 50,000 ÷ 20 = £2,500 a year.
      // Rent £1,000 a month = £12,000 a year every year; after housing 2,500 − 12,000 = −9,500.
      const plan = calculateRetirementPlan({
        currentAge: 40,
        retirementAge: 65,
        planToAge: 85,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 50_000 }],
        housing: { housingStatus: "renting", monthlyHousingCostGbp: 1_000 },
        assumptions: flatGrowth,
      });
      expect(plan.housing.kind).toBe("rent-for-life");
      expect(plan.projectedPotAtRetirementGbp.middle).toBe(50_000);
      expect(plan.estimatedYearlyIncomeGbp.middle).toBe(2_500);
      expect(plan.yearlySchedule).toHaveLength(20);
      for (const row of plan.yearlySchedule) {
        expect(row.housingCostYearlyGbp).toBe(12_000);
        expect(row.yearlyIncomeAfterHousing.middle).toBe(-9_500);
      }
    });

    it("zero contributions: a pot grows at the real rate only", () => {
      // £50,000 for 10 years at 5% nominal and 2% inflation: real rate 1.05 ÷ 1.02 − 1 = 0.0294118.
      // 1.0294118^10 = 1.336261, so 50,000 × 1.336261 = £66,813.05 (all three cases set to 5%).
      const plan = calculateRetirementPlan({
        currentAge: 55,
        retirementAge: 65,
        planToAge: 85,
        accounts: [{ id: "i1", type: "Investment", balanceGbp: 50_000, monthlyContributionGbp: 0 }],
        assumptions: { growthRates: { lower: 0.05, middle: 0.05, higher: 0.05 } },
      });
      expect(plan.projectedPotAtRetirementGbp.middle).toBe(66_813.05);
    });

    it("mortgage ending mid-retirement: payments in today's prices for the years left, then £0", () => {
      // Override: £600 a month for 1.5 years of retirement, retiring now (0 years away).
      //   year 0: 600 × 12 ÷ 1.02^0 = 7,200
      //   year 1: 600 × 6 ÷ 1.02^1 = 3,600 ÷ 1.02 = 3,529.41
      //   year 2 onwards: 0
      const plan = calculateRetirementPlan({
        currentAge: 66,
        retirementAge: 66,
        planToAge: 70,
        accounts: [],
        housing: {
          override: {
            kind: "mortgage-continues",
            monthlyPaymentGbp: 600,
            remainingYearsInRetirement: 1.5,
          },
        },
        assumptions: flatGrowth,
      });
      expect(plan.yearlySchedule.map((r) => r.housingCostYearlyGbp)).toEqual([
        7_200, 3_529.41, 0, 0,
      ]);
    });
  });

  describe("Full retirement plan projection & drawdown (calculateRetirementPlan)", () => {
    it("accumulates pensions, ISAs, and cash savings and draws down evenly (hand-computed at real 0%)", () => {
      const plan = calculateRetirementPlan({
        currentAge: 47,
        retirementAge: 67,
        planToAge: 87,
        accounts: [
          {
            id: "pen-1",
            name: "Workplace Pension",
            type: "Pension",
            balanceGbp: 100_000,
            monthlyContributionGbp: 500,
          },
          {
            id: "isa-1",
            name: "Stocks and Shares ISA",
            type: "ISA",
            balanceGbp: 40_000,
            monthlyContributionGbp: 250,
          },
          {
            id: "sav-1",
            name: "Easy Access Savings",
            type: "Saving",
            balanceGbp: 20_000,
            monthlyContributionGbp: 100,
            interestRatePct: 4.0,
          },
          {
            id: "cur-1",
            name: "Main Current",
            type: "Current",
            balanceGbp: 3_000,
          },
        ],
        target: { kind: "typed", yearlyAmount: 26_000 },
        statePension: {
          statePensionAge: 67,
          qualifyingYears: 35,
          taxYear: "2026/27",
        },
        housing: {
          housingStatus: "own_outright",
        },
        assumptions: {
          growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
          inflationRate: 0.02,
        },
      });

      // Current account excluded; counted pots = 100k + 40k + 20k = 160k
      expect(plan.currentCountedPotGbp).toBe(160_000);
      expect(plan.yearsToRetirement).toBe(20);
      expect(plan.yearsInRetirement).toBe(20);

      // Pensions and ISA at real 0%: 100,000 + 500 × 240 = 220,000; 40,000 + 250 × 240 = 100,000.
      expect(plan.projectedPotByGroupGbp.pensions.middle).toBe(220_000);
      expect(plan.projectedPotByGroupGbp.investments.middle).toBe(100_000);
      // Savings at 4% nominal, 2% inflation: real 1.04 ÷ 1.02 − 1 = 0.0196078, monthly
      // 1.0196078^(1/12) − 1 = 0.00161948. Over 240 months:
      //   20,000 × 1.00161948^240 = 20,000 × 1.474563 = 29,491.26
      //   100 × (1.474563 − 1) ÷ 0.00161948 = 29,303.35
      //   total 58,794.62 (rounding the two parts separately gives 58,794.61); drawdown over
      //   20 years at 0.0196078: 58,794.62 × 0.0196078 ÷ (1 − 1.0196078^−20) = 3,582.09
      // Pots at real 0%: 320,000 ÷ 20 = 16,000. Pot income 16,000 + 3,582.09 = 19,582.09.
      expect(plan.projectedPotByGroupGbp.savings).toBe(58_794.62);
      expect(plan.annualPotIncomeGbp.middle).toBe(19_582.09);
      // State Pension starts at 67 = retirement age: 19,582.09 + 12,547.60 = 32,129.69.
      expect(plan.estimatedYearlyIncomeGbp.middle).toBe(32_129.69);

      // Target and signed difference (estimated − target): 32,129.69 − 26,000 = 6,129.69.
      expect(plan.targetYearlyIncome).toBe(26_000);
      expect(plan.differenceYearly?.middle).toBe(6_129.69);

      // Neutral factual summary contains no advice or judgement words
      const serialized = JSON.stringify(plan);
      expect(findAdviceHits(serialized)).toEqual([]);
      expect(serialized).not.toMatch(/\b(need|should|enough|on track|behind|shortfall|ahead)\b/i);
    });

    it("leaves targetYearlyIncome and differenceYearly as null when no target is provided (R4)", () => {
      expect(resolveRetirementTarget(null)).toBeNull();
      expect(resolveRetirementTarget(undefined)).toBeNull();

      const plan = calculateRetirementPlan({
        currentAge: 40,
        retirementAge: 67,
        planToAge: 90,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 50_000 }],
      });
      expect(plan.targetYearlyIncome).toBeNull();
      expect(plan.differenceYearly).toBeNull();
      expect(plan.summary.targetYearlyGbp).toBeNull();
      expect(plan.summary.differenceMiddleYearlyGbp).toBeNull();
    });

    it("combines non-housing budget target lines with retirement housing costs when target is budget-built", () => {
      const plan = calculateRetirementPlan({
        currentAge: 45,
        retirementAge: 67,
        planToAge: 87,
        accounts: [{ id: "p1", type: "Pension", balanceGbp: 200_000 }],
        target: {
          kind: "budget",
          lines: [
            {
              name: "Food and bills",
              category: "essentials",
              monthlyAmount: 1_000,
              status: "continues",
            },
            { name: "Rent", category: "housing", monthlyAmount: 1_200, status: "continues" },
          ],
        },
        housing: {
          housingStatus: "renting",
          monthlyHousingCostGbp: 1_200,
        },
      });

      // Non-housing budget target = £1,000 * 12 = £12,000; housing = £1,200 * 12 = £14,400 -> £26,400
      expect(plan.targetDetail?.yearlyAmount).toBe(12_000);
      expect(plan.housing.averageAnnualCostGbp).toBe(14_400);
      expect(plan.targetYearlyIncome).toBe(26_400);
    });

    it("defaults unset cash savings interest rate to 0% nominal (eroding by inflation in real terms)", () => {
      const plan = calculateRetirementPlan({
        currentAge: 47,
        retirementAge: 57,
        planToAge: 77,
        accounts: [{ id: "sav-1", type: "Saving", balanceGbp: 10_000 }],
        assumptions: { inflationRate: 0.02 },
      });
      // £10,000 at 0% nominal with 2% inflation over 10 years -> 10000 / 1.02^10 ≈ 8,203.48
      expect(plan.projectedPotByGroupGbp.savings).toBe(
        roundPence(10_000 * calculateRealRate(0, 0.02) ** 0 + 10_000 * (1 / 1.02) ** 10 - 10_000),
      );
      expect(plan.projectedPotByGroupGbp.savings).toBe(8_203.48);
    });

    it("excludes all savings-category budget rows regardless of status", () => {
      const target = calculateTargetFromBudgetLines([
        { name: "Groceries", category: "food", monthlyAmount: 400, status: "continues" },
        { name: "ISA transfer", category: "savings", monthlyAmount: 500, status: "continues" },
        {
          name: "Pension top-up",
          category: "savings",
          monthlyAmount: 300,
          status: { kind: "changes", monthlyAmount: 200 },
        },
        { name: "Emergency fund", category: "savings", monthlyAmount: 100, status: "stops" },
      ]);
      expect(target.monthlyAmount).toBe(400);
      expect(target.yearlyAmount).toBe(4_800);
      expect(target.includedLineCount).toBe(1);
    });

    it("enforces integer ages in calculateRetirementPlan and rejects nominal rates < -100%", () => {
      expect(() =>
        calculateRetirementPlan({
          currentAge: 40.5,
          retirementAge: 67,
          planToAge: 90,
          accounts: [],
        }),
      ).toThrow(RangeError);
      expect(() =>
        calculateRetirementPlan({
          currentAge: 40,
          retirementAge: 67.5,
          planToAge: 90,
          accounts: [],
        }),
      ).toThrow(RangeError);
      expect(() =>
        calculateRetirementPlan({
          currentAge: 40,
          retirementAge: 67,
          planToAge: 90.25,
          accounts: [],
        }),
      ).toThrow(RangeError);
      expect(() =>
        projectRealPotBalance({
          initialBalance: 1_000,
          monthlyContribution: 100,
          nominalRate: -1.1,
          inflationRate: 0.02,
          years: 5,
        }),
      ).toThrow(RangeError);
    });

    it("includes negative balances on opted-in accounts in selectRetirementCountedSeries", () => {
      const accounts = [
        { id: "pen-1", type: "Pension", balanceGbp: 10_000 },
        {
          id: "cur-1",
          type: "Current",
          balanceGbp: -500,
          countsTowardsRetirement: true,
        },
      ];
      const rows = [
        { accountId: "pen-1", year: 2026, month: 10, value: 10_000 },
        { accountId: "cur-1", year: 2026, month: 10, value: -500 },
      ];
      const series = selectRetirementCountedSeries(accounts, rows);
      expect(series).toHaveLength(1);
      expect(series[0]?.totalCountedGbp).toBe(9_500);
    });

    it("resolves the share from the name too, as the balance does (an ISA cannot be joint)", () => {
      const accounts = [
        {
          id: "isa-1",
          name: "Cash ISA",
          type: "Saving",
          balanceGbp: 10_000,
          ownership: "joint" as const,
          sharePercent: 50,
        },
        {
          id: "sav-1",
          name: "House fund",
          type: "Saving",
          balanceGbp: 4_000,
          ownership: "joint" as const,
          sharePercent: 50,
        },
      ];
      const rows = [
        { accountId: "isa-1", year: 2026, month: 10, value: 10_000 },
        { accountId: "sav-1", year: 2026, month: 10, value: 4_000 },
      ];
      const series = selectRetirementCountedSeries(accounts, rows);
      expect(series[0]?.accounts).toEqual([
        { accountId: "isa-1", value: 10_000, carried: false },
        { accountId: "sav-1", value: 2_000, carried: false },
      ]);
      expect(series[0]?.totalCountedGbp).toBe(12_000);
    });
  });

  describe("Property-based invariants (fast-check)", () => {
    // A fixed seed keeps the generated cases the same on every run (E41 M2), so a mutation score
    // for retirement.ts does not change from run to run. The setting is reset after these
    // properties, so it never reaches a property test that runs after them in the same process.
    beforeAll(() => {
      fc.configureGlobal({ seed: 20261119 });
    });
    afterAll(() => {
      fc.resetConfigureGlobal();
    });

    it("satisfies Fisher equation identity: (1 + realRate) * (1 + inflationRate) = 1 + nominalRate", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -0.2, max: 0.3, noNaN: true }),
          fc.double({ min: -0.05, max: 0.2, noNaN: true }),
          (nominal, inflation) => {
            const real = calculateRealRate(nominal, inflation);
            expect((1 + real) * (1 + inflation)).toBeCloseTo(1 + nominal, 9);
          },
        ),
      );
    });

    it("preserves lower <= middle <= higher ordering across pots and yearly incomes for any ordered growth band", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 65 }),
          fc.integer({ min: 0, max: 35 }),
          fc.integer({ min: 5, max: 35 }),
          fc.double({ min: 0, max: 500_000, noNaN: true }),
          fc.double({ min: 0, max: 3_000, noNaN: true }),
          fc.double({ min: 0, max: 0.04, noNaN: true }),
          fc.double({ min: 0, max: 0.04, noNaN: true }),
          fc.double({ min: 0, max: 0.04, noNaN: true }),
          fc.double({ min: 0, max: 60_000, noNaN: true }),
          (
            currentAge,
            yearsToRetire,
            yearsInRetire,
            initialPot,
            monthlyContrib,
            rBase,
            rDelta1,
            rDelta2,
            targetYearly,
          ) => {
            const retirementAge = currentAge + yearsToRetire;
            const planToAge = retirementAge + yearsInRetire;
            const lower = rBase;
            const middle = rBase + rDelta1;
            const higher = middle + rDelta2;

            const result = calculateRetirementPlan({
              currentAge,
              retirementAge,
              planToAge,
              accounts: [
                {
                  id: "pen",
                  type: "Pension",
                  balanceGbp: initialPot,
                  monthlyContributionGbp: monthlyContrib,
                },
              ],
              target: targetYearly,
              assumptions: {
                growthRates: { lower, middle, higher },
                inflationRate: 0.02,
              },
              statePension: {
                statePensionAge: 67,
                qualifyingYears: 35,
                taxYear: "2026/27",
              },
            });

            expect(result.projectedPotAtRetirementGbp.lower).toBeLessThanOrEqual(
              result.projectedPotAtRetirementGbp.middle,
            );
            expect(result.projectedPotAtRetirementGbp.middle).toBeLessThanOrEqual(
              result.projectedPotAtRetirementGbp.higher,
            );
            expect(result.estimatedYearlyIncomeGbp.lower).toBeLessThanOrEqual(
              result.estimatedYearlyIncomeGbp.middle,
            );
            expect(result.estimatedYearlyIncomeGbp.middle).toBeLessThanOrEqual(
              result.estimatedYearlyIncomeGbp.higher,
            );

            if (result.differenceYearly && result.targetYearlyIncome !== null) {
              expect(result.differenceYearly.lower).toBe(
                roundPence(result.estimatedYearlyIncomeGbp.lower - result.targetYearlyIncome),
              );
              expect(result.differenceYearly.middle).toBe(
                roundPence(result.estimatedYearlyIncomeGbp.middle - result.targetYearlyIncome),
              );
              expect(result.differenceYearly.higher).toBe(
                roundPence(result.estimatedYearlyIncomeGbp.higher - result.targetYearlyIncome),
              );
            }
          },
        ),
      );
    });

    it("depletes the pot to £0 over `yearsInRetirement` under annuity-style even real drawdown", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1_000, max: 1_000_000, noNaN: true }),
          fc.double({ min: -0.05, max: 0.1, noNaN: true }),
          fc.integer({ min: 1, max: 50 }),
          (pot, realRate, years) => {
            const drawdown = calculateEvenRealDrawdown(pot, realRate, years);
            let remaining = pot;
            for (let y = 0; y < years; y++) {
              remaining = remaining * (1 + realRate) - drawdown;
            }
            expect(Math.abs(remaining)).toBeLessThan(1e-4);
          },
        ),
      );
    });

    it("preserves monotonicity of projectRealPotBalance in initialBalance, monthlyContribution, and nominalRate", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 200_000, noNaN: true }),
          fc.double({ min: 0, max: 50_000, noNaN: true }),
          fc.double({ min: 0, max: 2_000, noNaN: true }),
          fc.double({ min: 0, max: 1_000, noNaN: true }),
          fc.double({ min: -0.02, max: 0.08, noNaN: true }),
          fc.double({ min: 0, max: 0.05, noNaN: true }),
          fc.integer({ min: 0, max: 40 }),
          (b0, dB, m0, dM, r0, dR, years) => {
            const base = projectRealPotBalance({
              initialBalance: b0,
              monthlyContribution: m0,
              nominalRate: r0,
              inflationRate: 0.02,
              years,
            });
            const moreInitial = projectRealPotBalance({
              initialBalance: b0 + dB,
              monthlyContribution: m0,
              nominalRate: r0,
              inflationRate: 0.02,
              years,
            });
            const moreMonthly = projectRealPotBalance({
              initialBalance: b0,
              monthlyContribution: m0 + dM,
              nominalRate: r0,
              inflationRate: 0.02,
              years,
            });
            const higherRate = projectRealPotBalance({
              initialBalance: b0,
              monthlyContribution: m0,
              nominalRate: r0 + dR,
              inflationRate: 0.02,
              years,
            });
            expect(moreInitial.endBalance).toBeGreaterThanOrEqual(base.endBalance);
            expect(moreMonthly.endBalance).toBeGreaterThanOrEqual(base.endBalance);
            expect(higherRate.endBalance).toBeGreaterThanOrEqual(base.endBalance);
          },
        ),
      );
    });

    it("enforces State Pension <10 / 10..35 / >=35 bands and age-gating bounds", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 55, max: 75 }),
          fc.integer({ min: 40, max: 100 }),
          (qualifyingYears, statePensionAge, queryAge) => {
            const sp = calculateRetirementStatePension({
              qualifyingYears,
              statePensionAge,
              taxYear: "2026/27",
            });
            if (qualifyingYears < 10) {
              expect(sp.annualAmountGbp).toBe(0);
              expect(sp.weeklyAmountGbp).toBe(0);
            } else if (qualifyingYears >= 35) {
              expect(sp.annualAmountGbp).toBe(12_547.6);
              expect(sp.qualifyingYearsUsed).toBe(35);
            } else {
              expect(sp.annualAmountGbp).toBeGreaterThan(0);
              expect(sp.annualAmountGbp).toBeLessThan(12_547.6);
            }
            const atAge = statePensionAnnualAtAge(queryAge, sp);
            expect(atAge).toBe(queryAge >= statePensionAge ? sp.annualAmountGbp : 0);
          },
        ),
      );
    });

    it("keeps budget target invariant when adding `stops` or housing rows", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 5_000, noNaN: true }),
          fc.double({ min: 0, max: 5_000, noNaN: true }),
          fc.double({ min: 0, max: 5_000, noNaN: true }),
          (continuingAmt, stoppedAmt, housingAmt) => {
            const base = calculateTargetFromBudgetLines([
              {
                name: "Food",
                category: "essentials",
                monthlyAmount: continuingAmt,
                status: "continues",
              },
            ]);
            const withStoppedAndHousing = calculateTargetFromBudgetLines([
              {
                name: "Food",
                category: "essentials",
                monthlyAmount: continuingAmt,
                status: "continues",
              },
              {
                name: "Commute",
                category: "transport",
                monthlyAmount: stoppedAmt,
                status: "stops",
              },
              { name: "Rent", category: "housing", monthlyAmount: housingAmt, status: "continues" },
              {
                name: "Mortgage",
                category: "mortgage",
                monthlyAmount: housingAmt,
                status: "continues",
              },
            ]);
            expect(withStoppedAndHousing.monthlyAmount).toBe(base.monthlyAmount);
            expect(withStoppedAndHousing.yearlyAmount).toBe(base.yearlyAmount);
          },
        ),
      );
    });
  });
});

describe("E33 one pension projection (RD6)", () => {
  const pensionAccount = {
    id: "pen",
    type: "Pension",
    balanceGbp: 50_000,
    monthlyContributionGbp: 100,
  };
  const workplacePension = {
    annualSalary: 40_000,
    employeePercent: 5,
    employerPercent: 3,
  };
  const basePlan = {
    currentAge: 40,
    retirementAge: 50,
    planToAge: 80,
    accounts: [pensionAccount],
    workplacePension,
  };

  it("projectRealPotBalance reports the balance at the end of each whole year", () => {
    const withMonthly = projectRealPotBalance({
      initialBalance: 1_000,
      monthlyContribution: 50,
      nominalRate: 0.05,
      years: 3,
    });
    expect(withMonthly.yearEndBalances).toHaveLength(3);
    expect(withMonthly.yearEndBalances[2]).toBe(withMonthly.endBalance);
    expect(withMonthly.yearEndContributions).toEqual([600, 1_200, 1_800]);

    const closedForm = projectRealPotBalance({
      initialBalance: 1_000,
      nominalRate: 0.05,
      years: 2,
    });
    const real = calculateRealRate(0.05, DEFAULT_RETIREMENT_INFLATION_RATE);
    expect(closedForm.yearEndBalances).toEqual([
      roundPence(1_000 * (1 + real)),
      roundPence(1_000 * (1 + real) ** 2),
    ]);
  });

  it("adds saved workplace contributions to the pension pots", () => {
    const without = calculateRetirementPlan({ ...basePlan, workplacePension: null });
    const withWorkplace = calculateRetirementPlan(basePlan);
    expect(withWorkplace.workplacePension?.monthlyTotal).toBeCloseTo(
      (40_000 * 0.05) / 12 + (40_000 * 0.03) / 12,
      6,
    );
    const extra = projectRealPotBalance({
      initialBalance: 0,
      monthlyContribution: withWorkplace.workplacePension?.monthlyTotal ?? 0,
      nominalRate: DEFAULT_RETIREMENT_GROWTH_CASES.middle,
      years: 10,
    }).endBalance;
    expect(withWorkplace.projectedPotAtRetirementGbp.middle).toBeCloseTo(
      without.projectedPotAtRetirementGbp.middle + extra,
      1,
    );
    expect(without.workplacePension).toBeNull();
  });

  it("states what goes into pensions each year, for the annual allowance line", () => {
    const plan = calculateRetirementPlan({
      ...basePlan,
      additionalMonthlyPensionContributionGbp: 200,
    });
    expect(plan.pensionPaidInYearlyGbp).toBeCloseTo((100 + 200 + (40_000 * 0.08) / 12) * 12, 2);
  });

  it("gives a year-by-year path whose last point is the pot at retirement", () => {
    const plan = calculateRetirementPlan(basePlan);
    expect(plan.accumulation).toHaveLength(11);
    expect(plan.accumulation[0]).toMatchObject({ age: 40, yearIndex: 0, paidInGbp: 50_000 });
    expect(plan.accumulation[0]?.potGbp.middle).toBe(50_000);
    const last = plan.accumulation[10];
    expect(last?.age).toBe(50);
    for (const c of ["lower", "middle", "higher"] as const) {
      expect(last?.potGbp[c]).toBeCloseTo(plan.projectedPotAtRetirementGbp[c], 1);
    }
    const monthly = 100 + (plan.workplacePension?.monthlyTotal ?? 0);
    expect(last?.paidInGbp).toBeCloseTo(50_000 + monthly * 120, 1);
  });

  it("has a single point when retiring now", () => {
    const plan = calculateRetirementPlan({ ...basePlan, retirementAge: 40 });
    expect(plan.accumulation).toHaveLength(1);
  });
});
