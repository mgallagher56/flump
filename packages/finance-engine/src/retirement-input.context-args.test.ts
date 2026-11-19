import { describe, expect, it } from "vitest";
import type { BuildContextPackInput } from "./ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import type { ProfileFacts } from "./picture/input.js";
import { DEFAULT_FINANCIAL_BASELINE } from "./profile.js";
import { retirementArgsFromContextInput } from "./retirement-input.js";

const NOW = new Date("2026-11-17T12:00:00Z");

const facts = (over: Partial<ProfileFacts>): ProfileFacts => ({
  annualSalary: null,
  employmentType: null,
  taxRegion: null,
  studentLoanPlans: null,
  pensionPercent: null,
  isSalarySacrifice: null,
  ...over,
});

describe("retirementArgsFromContextInput", () => {
  it("passes the saved plan, birth year, housing facts, accounts, budget and workplace pension", () => {
    const retirementPlan = { retirementAge: 65, planToAge: 85 };
    const accounts = [{ id: "pen", name: "Work pension", type: "Pension", balance: 1000 }];
    const budgetEntries = [
      {
        id: "food",
        category: "expenses",
        name: "Food",
        amount: 300,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ];
    const workplacePension = { annualSalary: 40_000, employeePercent: 5, employerPercent: 3 };
    const overrides = { retirementAge: 60 };
    const data: BuildContextPackInput = {
      // The profile facts win over the baseline's status.
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, housingStatus: "MORTGAGE" },
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      profileFacts: facts({ housingStatus: "renting", monthlyHousingCost: 1100 }),
      retirementPlan,
      birthYear: 1981,
      accounts,
      budgetEntries,
      workplacePension,
    };
    expect(retirementArgsFromContextInput(data, NOW, overrides)).toEqual({
      plan: retirementPlan,
      birthYear: 1981,
      now: NOW,
      housingStatus: "renting",
      monthlyHousingCostGbp: 1100,
      accounts,
      budgetEntries,
      workplacePension,
      overrides,
    });
  });

  it("falls back to the baseline's housing status when no profile facts are loaded", () => {
    const args = retirementArgsFromContextInput(
      {
        baseline: { ...DEFAULT_FINANCIAL_BASELINE, housingStatus: "OWN_OUTRIGHT" },
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      },
      NOW,
    );
    // Passed as saved; the builder reads it in any case.
    expect(args.housingStatus).toBe("OWN_OUTRIGHT");
    expect(args.monthlyHousingCostGbp).toBeNull();
  });

  it("fills nothing in when nothing is saved", () => {
    const args = retirementArgsFromContextInput(
      { baseline: DEFAULT_FINANCIAL_BASELINE, netWorthBasis: DEFAULT_NET_WORTH_BASIS },
      NOW,
    );
    expect(args).toEqual({
      plan: null,
      birthYear: null,
      now: NOW,
      housingStatus: null,
      monthlyHousingCostGbp: null,
      accounts: [],
      budgetEntries: [],
      workplacePension: null,
      overrides: undefined,
    });
  });
});
