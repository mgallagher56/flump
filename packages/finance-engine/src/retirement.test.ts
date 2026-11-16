import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { findAdviceHits } from "./compliance/advice-lexicon.js";
import {
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
      expect(housing.monthlyCostAtRetirementGbp).toBe(1_055.67);
      expect(housing.annualCostAtRetirementGbp).toBe(roundPence(1_055.67 * 12));

      // First 5 years of retirement have full payments; years 6..25 are £0
      for (let i = 0; i < 5; i++) {
        expect(housing.yearlySchedule[i]?.annualCostGbp).toBe(roundPence(1_055.67 * 12));
      }
      for (let i = 5; i < 25; i++) {
        expect(housing.yearlySchedule[i]?.annualCostGbp).toBe(0);
      }
      expect(housing.totalRetirementHousingCostGbp).toBe(roundPence(1_055.67 * 12 * 5));
      expect(housing.averageAnnualCostGbp).toBe(
        roundPence(housing.totalRetirementHousingCostGbp / 25),
      );
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
      expect(housing.annualCostAtRetirementGbp).toBe(11_400);
    });
  });

  describe("Full retirement plan projection & drawdown (calculateRetirementPlan)", () => {
    it("accumulates pensions, ISAs, and cash savings at their respective real rates and draws down evenly", () => {
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
      });

      // Current account excluded; counted pots = 100k + 40k + 20k = 160k
      expect(plan.currentCountedPotGbp).toBe(160_000);
      expect(plan.yearsToRetirement).toBe(20);
      expect(plan.yearsInRetirement).toBe(20);

      // Lower < Middle < Higher
      expect(plan.projectedPotAtRetirementGbp.lower).toBeLessThan(
        plan.projectedPotAtRetirementGbp.middle,
      );
      expect(plan.projectedPotAtRetirementGbp.middle).toBeLessThan(
        plan.projectedPotAtRetirementGbp.higher,
      );

      // Even real drawdown over 20 years + full State Pension (£12,547.60)
      expect(plan.annualPotIncomeGbp.middle).toBe(
        roundPence(plan.projectedPotAtRetirementGbp.middle / 20),
      );
      expect(plan.estimatedYearlyIncomeGbp.middle).toBe(
        roundPence(plan.annualPotIncomeGbp.middle + 12_547.6),
      );

      // Target and signed difference (estimated - target)
      expect(plan.targetYearlyIncome).toBe(26_000);
      expect(plan.differenceYearly).not.toBeNull();
      expect(plan.differenceYearly?.lower).toBe(
        roundPence(plan.estimatedYearlyIncomeGbp.lower - 26_000),
      );
      expect(plan.differenceYearly?.middle).toBe(
        roundPence(plan.estimatedYearlyIncomeGbp.middle - 26_000),
      );
      expect(plan.differenceYearly?.higher).toBe(
        roundPence(plan.estimatedYearlyIncomeGbp.higher - 26_000),
      );

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
  });

  describe("Property-based invariants (fast-check)", () => {
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
  });
});
