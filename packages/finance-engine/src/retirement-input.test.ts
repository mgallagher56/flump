import { describe, expect, it } from "vitest";
import { calculateRetirementPlan } from "./retirement.js";
import { buildRetirementPlanInput, type RetirementSavedPlanInput } from "./retirement-input.js";

const NOW = new Date("2026-11-17T12:00:00Z");

const savedPlan: RetirementSavedPlanInput = {
  retirementAge: 65,
  planToAge: 85,
  target: { kind: "typed", yearlyAmount: 20_000 },
  housingOverride: null,
  statePensionAge: 67,
  statePensionAnnualForecastGbp: 11_000,
  statePensionQualifyingYears: null,
  growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
  inflationRate: 0.02,
  cashSavingsNominalRate: 0.02,
  realRentGrowthRate: 0,
  excludedAccountIds: [],
};

const accounts = [
  { id: "pen", name: "Work pension", type: "Pension", balance: 100_000, monthlyContribution: 0 },
  {
    id: "joint-sav",
    name: "Joint saver",
    type: "Saving",
    balance: 40_000,
    monthlyContribution: 200,
    ownership: "joint",
    sharePercent: 50,
  },
  { id: "home", name: "Home", type: "Property", balance: 300_000 },
];

describe("buildRetirementPlanInput", () => {
  it("lists every missing detail and builds no input without birth year, retirement age or plan-to age", () => {
    const built = buildRetirementPlanInput({
      plan: { ...savedPlan, retirementAge: null, planToAge: null },
      birthYear: null,
      now: NOW,
      accounts,
    });
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.missing).toEqual(["birthYear", "retirementAge", "planToAge"]);
  });

  it("treats no saved plan as missing retirement age and plan-to age (no invented 67 or 90)", () => {
    const built = buildRetirementPlanInput({ plan: null, birthYear: 1981, now: NOW, accounts });
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.missing).toEqual(["retirementAge", "planToAge"]);
  });

  it("works out the age from the birth year and clamps a saved retirement age below it", () => {
    // 2026 − 1961 = 65, saved retirement age 60 is below it, so 65 is used; plan-to stays 85.
    const built = buildRetirementPlanInput({
      plan: { ...savedPlan, retirementAge: 60 },
      birthYear: 1961,
      now: NOW,
      accounts,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.currentAge).toBe(65);
    expect(built.input.retirementAge).toBe(65);
    expect(built.retirementAgeAdjusted).toBe(true);
    expect(() => calculateRetirementPlan(built.input)).not.toThrow();
  });

  it("applies the joint share to balances and contributions, and never counts property", () => {
    const built = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const joint = built.input.accounts.find((a) => a.id === "joint-sav");
    // 50% of £40,000 and of £200 a month.
    expect(joint?.balanceGbp).toBe(20_000);
    expect(joint?.monthlyContributionGbp).toBe(100);
    expect(joint?.ownership).toBe("joint");
    expect(joint?.sharePercent).toBe(50);
    expect(built.countableAccounts.map((a) => a.id)).toEqual(["pen", "joint-sav"]);
  });

  it("maps excludedAccountIds to countsTowardsRetirement false", () => {
    const built = buildRetirementPlanInput({
      plan: { ...savedPlan, excludedAccountIds: ["joint-sav"] },
      birthYear: 1981,
      now: NOW,
      accounts,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const joint = built.input.accounts.find((a) => a.id === "joint-sav");
    expect(joint?.countsTowardsRetirement).toBe(false);
    // Pension £100,000 only (real 0% growth, age 45 to 65): 100,000 ÷ 20 = £5,000 a year.
    const plan = calculateRetirementPlan(built.input);
    expect(plan.currentCountedPotGbp).toBe(100_000);
    expect(plan.annualPotIncomeGbp.middle).toBe(5_000);
  });

  it("leaves State Pension out until both an age and an amount source are saved", () => {
    const noAge = buildRetirementPlanInput({
      plan: { ...savedPlan, statePensionAge: null },
      birthYear: 1981,
      now: NOW,
      accounts,
    });
    expect(noAge.ok && noAge.statePensionMissing).toEqual(["statePensionAge"]);
    expect(noAge.ok && noAge.input.statePension).toBeNull();

    const noAmount = buildRetirementPlanInput({
      plan: { ...savedPlan, statePensionAnnualForecastGbp: null },
      birthYear: 1981,
      now: NOW,
      accounts,
    });
    expect(noAmount.ok && noAmount.statePensionMissing).toEqual(["statePensionAmount"]);
  });

  it("lets overrides replace saved values without changing the saved plan", () => {
    const built = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
      overrides: { retirementAge: 60, targetYearlyGbp: 30_000, growthRates: { middle: 0.05 } },
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.input.retirementAge).toBe(60);
    expect(built.input.target).toEqual({ kind: "typed", yearlyAmount: 30_000 });
    expect(built.input.assumptions?.growthRates).toEqual({
      lower: 0.02,
      middle: 0.05,
      higher: 0.02,
    });
    expect(savedPlan.retirementAge).toBe(65);
  });

  it("uses the shared balance and payment of a joint mortgage for housing", () => {
    const built = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      housingStatus: "mortgage",
      accounts: [
        {
          id: "m",
          type: "Mortgage",
          balance: -200_000,
          interestRate: 4,
          monthlyContribution: 1_000,
          termMonths: 300,
          ownership: "joint",
        },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.input.housing?.mortgage).toEqual({
      balanceGbp: 100_000,
      interestRateApr: 4,
      remainingTermMonths: 300,
      monthlyPaymentGbp: 500,
    });
  });
});
