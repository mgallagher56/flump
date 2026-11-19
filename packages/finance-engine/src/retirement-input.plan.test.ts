import { describe, expect, it } from "vitest";
import {
  type BuildRetirementPlanInputArgs,
  buildRetirementPlanInput,
  type RetirementSavedPlanInput,
} from "./retirement-input.js";

// Born 1981, so 45 in 2026.
const NOW = new Date("2026-11-17T12:00:00Z");

const plan: RetirementSavedPlanInput = {
  retirementAge: 65,
  planToAge: 85,
  target: { kind: "typed", yearlyAmount: 20_000 },
  statePensionAge: 67,
  statePensionAnnualForecastGbp: 11_000,
  statePensionQualifyingYears: null,
};

function run(over: Partial<BuildRetirementPlanInputArgs>) {
  return buildRetirementPlanInput({ plan, birthYear: 1981, now: NOW, accounts: [], ...over });
}

function built(over: Partial<BuildRetirementPlanInputArgs>) {
  const result = run(over);
  if (!result.ok) throw new Error("expected a built input");
  return result;
}

function missing(over: Partial<BuildRetirementPlanInputArgs>) {
  const result = run(over);
  if (result.ok) throw new Error("expected missing details");
  return result.missing;
}

describe("buildRetirementPlanInput: missing details", () => {
  it("names only the birth year when that is all that is missing", () => {
    expect(missing({ birthYear: null })).toEqual(["birthYear"]);
  });

  it("names only the retirement age when that is all that is missing", () => {
    expect(missing({ plan: { ...plan, retirementAge: null } })).toEqual(["retirementAge"]);
  });

  it("names only the plan-to age when that is all that is missing", () => {
    expect(missing({ plan: { ...plan, planToAge: null } })).toEqual(["planToAge"]);
  });

  it("treats a birth year of 0 as not saved", () => {
    const result = run({ birthYear: 0 });
    expect(result.ok).toBe(false);
    expect(result.currentAge).toBeNull();
    if (!result.ok) expect(result.missing).toEqual(["birthYear"]);
  });

  it("treats a retirement age that is not a whole number as not saved", () => {
    expect(missing({ plan: { ...plan, retirementAge: 65.5 } })).toEqual(["retirementAge"]);
  });

  it("treats a negative retirement age as not saved", () => {
    expect(missing({ plan: { ...plan, retirementAge: -1 } })).toEqual(["retirementAge"]);
  });
});

describe("buildRetirementPlanInput: ages", () => {
  it("raises a saved retirement age of 0 to the current age", () => {
    // 0 is a whole age, so it is kept and then raised to 2026 - 1981 = 45.
    const result = built({ plan: { ...plan, retirementAge: 0 } });
    expect(result.input.retirementAge).toBe(45);
    expect(result.retirementAgeAdjusted).toBe(true);
  });

  it("does not mark the retirement age adjusted when the saved one is used", () => {
    // Saved 65 is above the current age of 45, so it is used as it is.
    const result = built({});
    expect(result.input.retirementAge).toBe(65);
    expect(result.retirementAgeAdjusted).toBe(false);
  });

  it("raises a plan-to age below the retirement age to one year after it", () => {
    // Retirement at 65, plan-to 60 saved: raised to 65 + 1 = 66.
    const result = built({ plan: { ...plan, planToAge: 60 } });
    expect(result.input.planToAge).toBe(66);
  });
});

describe("buildRetirementPlanInput: the spending target", () => {
  it("uses the saved typed target when no override is given", () => {
    expect(built({}).input.target).toEqual({ kind: "typed", yearlyAmount: 20_000 });
  });

  it("has no target when the saved plan has none", () => {
    expect(built({ plan: { ...plan, target: null } }).input.target).toBeNull();
  });

  it("has no target from budget lines when no budget is saved", () => {
    const result = built({ plan: { ...plan, target: { kind: "budget", lineSettings: [] } } });
    expect(result.input.target).toBeNull();
  });
});

describe("buildRetirementPlanInput: no saved plan but what-if ages", () => {
  it("builds from the overrides and the reference assumptions, never reading the missing plan", () => {
    const result = built({ plan: null, overrides: { retirementAge: 66, planToAge: 90 } });
    expect(result.input.retirementAge).toBe(66);
    expect(result.input.planToAge).toBe(90);
    expect(result.input.target).toBeNull();
    expect(result.input.statePension).toBeNull();
    expect(result.input.housing?.override).toBeNull();
    // Decision RD4: a 2%, 5%, 8% band and 2% inflation until the user changes them.
    expect(result.input.assumptions).toEqual({
      growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
      inflationRate: 0.02,
    });
  });
});

describe("buildRetirementPlanInput: State Pension", () => {
  it("includes the State Pension with its age and forecast", () => {
    const result = built({});
    expect(result.statePensionMissing).toEqual([]);
    expect(result.input.statePension).toEqual({
      statePensionAge: 67,
      annualForecastGbp: 11_000,
      qualifyingYears: null,
    });
  });

  it("includes the State Pension from qualifying years when no forecast is saved", () => {
    const result = built({
      plan: { ...plan, statePensionAnnualForecastGbp: null, statePensionQualifyingYears: 35 },
    });
    expect(result.statePensionMissing).toEqual([]);
    expect(result.input.statePension).toEqual({
      statePensionAge: 67,
      annualForecastGbp: null,
      qualifyingYears: 35,
    });
  });
});

describe("buildRetirementPlanInput: saved assumptions", () => {
  it("passes the saved inflation, cash rate, rent growth and housing override through", () => {
    const result = built({
      plan: {
        ...plan,
        inflationRate: 0.03,
        cashSavingsNominalRate: 0.04,
        realRentGrowthRate: 0.01,
        housingOverride: { kind: "own-outright" },
      },
    });
    expect(result.input.assumptions?.inflationRate).toBe(0.03);
    expect(result.input.assumptions?.cashSavingsNominalRate).toBe(0.04);
    expect(result.input.assumptions?.realRentGrowthRate).toBe(0.01);
    expect(result.input.housing?.override).toEqual({ kind: "own-outright" });
  });

  it("leaves the cash rate and rent growth out when none is saved", () => {
    const result = built({
      plan: { ...plan, cashSavingsNominalRate: null, realRentGrowthRate: null },
    });
    expect(result.input.assumptions).not.toHaveProperty("cashSavingsNominalRate");
    expect(result.input.assumptions).not.toHaveProperty("realRentGrowthRate");
  });
});

describe("buildRetirementPlanInput: workplace pension", () => {
  it("keeps the saved qualifying earnings choice when the scenario does not change it", () => {
    const workplacePension = {
      annualSalary: 40_000,
      employeePercent: 5,
      employerPercent: 3,
      useQualifyingEarnings: true,
    };
    expect(built({ workplacePension }).input.workplacePension).toEqual(workplacePension);
  });
});
