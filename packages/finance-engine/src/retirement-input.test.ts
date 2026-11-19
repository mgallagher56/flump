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

  it("costs the home mortgage, never a buy-to-let one listed first (HM-8)", () => {
    // The BTL (subtype or name) is skipped; the home mortgage is used whole (sole):
    // balance |-180,000| = 180,000, rate 3.5%, term 240 months, payment £950.
    const built = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      housingStatus: "mortgage",
      accounts: [
        {
          id: "btl",
          name: "Flat mortgage",
          type: "Mortgage",
          accountSubtype: "btl_mortgage",
          balance: -150_000,
          interestRate: 5,
          monthlyContribution: 700,
          termMonths: 120,
        },
        {
          id: "btl-name",
          name: "Buy to let mortgage",
          type: "Mortgage",
          balance: -90_000,
          interestRate: 6,
          monthlyContribution: 500,
          termMonths: 60,
        },
        {
          id: "home-m",
          name: "Home mortgage",
          type: "Mortgage",
          balance: -180_000,
          interestRate: 3.5,
          monthlyContribution: 950,
          termMonths: 240,
        },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.input.housing?.mortgage).toEqual({
      balanceGbp: 180_000,
      interestRateApr: 3.5,
      remainingTermMonths: 240,
      monthlyPaymentGbp: 950,
    });
  });

  it("passes the saved workplace pension through, and the scenario can change your rate", () => {
    const workplacePension = { annualSalary: 40_000, employeePercent: 5, employerPercent: 3 };
    const built = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
      workplacePension,
      overrides: { employeePercent: 8, useQualifyingEarnings: true },
    });
    expect(built.ok && built.input.workplacePension).toEqual({
      ...workplacePension,
      employeePercent: 8,
      useQualifyingEarnings: true,
    });
    const none = buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
      overrides: { employeePercent: 8 },
    });
    expect(none.ok && none.input.workplacePension).toBeNull();
  });
});

describe("one projection: the Retirement scenario at the saved values is the saved plan (RD6)", () => {
  it("gives identical figures for identical inputs", () => {
    const workplacePension = {
      annualSalary: 52_000,
      employeePercent: 6,
      employerPercent: 4,
      isSalarySacrifice: true,
      passEmployerNi: true,
    };
    const args = {
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
      workplacePension,
      housingStatus: "renting",
      monthlyHousingCostGbp: 900,
    };
    const saved = buildRetirementPlanInput(args);
    const scenario = buildRetirementPlanInput({
      ...args,
      overrides: {
        retirementAge: savedPlan.retirementAge ?? undefined,
        planToAge: savedPlan.planToAge ?? undefined,
        employeePercent: workplacePension.employeePercent,
        useQualifyingEarnings: false,
        additionalMonthlyPensionContributionGbp: 0,
        growthRates: savedPlan.growthRates ?? undefined,
        inflationRate: savedPlan.inflationRate ?? undefined,
      },
    });
    expect(saved.ok && scenario.ok).toBe(true);
    if (!saved.ok || !scenario.ok) return;
    expect(calculateRetirementPlan(scenario.input)).toEqual(calculateRetirementPlan(saved.input));
  });
});

describe("buildRetirementPlanInput: linked budget lines (decision 1)", () => {
  it("never builds a target line from a linked line's stored amount", () => {
    const entry = (over: Record<string, unknown>) => ({
      id: "e",
      category: "bills",
      name: "Entry",
      amount: 0,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      ...over,
    });
    const built = buildRetirementPlanInput({
      plan: { ...savedPlan, target: { kind: "budget", lineSettings: [] } },
      birthYear: 1981,
      now: NOW,
      accounts,
      budgetEntries: [
        // Linked lines are left out: take-home is income and housing is modelled on its own.
        entry({ id: "pay", category: "income", isIncome: true, linkKind: "take_home" }),
        entry({ id: "rent", category: "housing", linkKind: "housing" }),
        entry({ id: "food", category: "expenses", amount: 300 }),
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const target = built.input.target;
    expect(target?.kind).toBe("budget");
    if (target?.kind !== "budget") return;
    expect(target.lines.map((l) => l.id)).toEqual(["food"]);
  });

  // Audit slice 5: a debt line linked to a loan stays a target line, at the loan's payment, so
  // linking it never drops it from the retirement spending target.
  it("keeps a linked debt line at the account's payment, and leaves out one that is Not set", () => {
    const entry = (over: Record<string, unknown>) => ({
      id: "e",
      category: "debt",
      name: "Entry",
      amount: 0,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      ...over,
    });
    const built = buildRetirementPlanInput({
      plan: {
        ...savedPlan,
        target: { kind: "budget", lineSettings: [{ budgetEntryId: "repay", status: "stops" }] },
      },
      birthYear: 1981,
      now: NOW,
      accounts: [
        ...accounts,
        // Joint at 50%: a £360 payment is £180 at the person's share.
        {
          id: "car",
          name: "Car loan",
          type: "Loan",
          balance: -6000,
          monthlyContribution: 360,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      budgetEntries: [
        entry({ id: "repay", name: "Car loan", linkKind: "debt", linkAccountId: "car" }),
        // Its account was deleted: Not set, so no figure to count.
        entry({ id: "gone", name: "Old card", linkKind: "debt", linkAccountId: null }),
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const target = built.input.target;
    if (target?.kind !== "budget") throw new Error("expected a budget target");
    expect(target.lines).toEqual([
      expect.objectContaining({ id: "repay", amount: 180, frequency: "monthly", status: "stops" }),
    ]);
  });
});

// Audit slice 5, the housing line (L14, L57, JO-8): Retirement counts the rent at the share the
// linked rent line says, the same figure the budget counts.
describe("buildRetirementPlanInput: housing from the one housing figure", () => {
  const rentLine = (over: Record<string, unknown>) => ({
    id: "rent",
    category: "housing",
    name: "Rent",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isEssential: true,
    linkKind: "housing",
    ...over,
  });
  const build = (budgetEntries: ReturnType<typeof rentLine>[]) =>
    buildRetirementPlanInput({
      plan: savedPlan,
      birthYear: 1981,
      now: NOW,
      accounts,
      housingStatus: "renting",
      monthlyHousingCostGbp: 1500,
      budgetEntries,
    });

  it("counts a shared rent at the rent line's share", () => {
    // £1,500 at 50% = £750.
    const built = build([rentLine({ ownership: "joint", sharePercent: 50 })]);
    if (!built.ok) throw new Error("expected built");
    expect(built.input.housing?.monthlyHousingCostGbp).toBe(750);
  });

  it("counts the whole saved rent when the rent line is sole, or there is none", () => {
    const sole = build([rentLine({})]);
    const none = build([]);
    if (!sole.ok || !none.ok) throw new Error("expected built");
    expect(sole.input.housing?.monthlyHousingCostGbp).toBe(1500);
    expect(none.input.housing?.monthlyHousingCostGbp).toBe(1500);
  });
});
