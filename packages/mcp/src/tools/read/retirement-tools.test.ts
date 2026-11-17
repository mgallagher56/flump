import type { BuildContextPackInput } from "@flump/finance-engine";
import { afterEach, describe, expect, it } from "vitest";
import { collectToolOutputViolations } from "../../policy/output-policy.js";
import { connectTestClient, TEST_TOKEN, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Band = { lower: number; middle: number; higher: number };

type Env = {
  result: Record<string, unknown> & {
    estimatedYearlyIncomeGbp: Band;
    incomeBeforeStatePensionAgeGbp: Band;
    incomeFromStatePensionAgeGbp: Band;
    differenceBeforeStatePensionAgeGbp: Band;
    differenceFromStatePensionAgeGbp: Band;
  };
  missing: Array<{ field: string; askUser: string }>;
  assumptions: Array<{ field: string; value?: unknown; source: string }>;
};

const FULL = { ...TEST_TOKEN, scopes: ["mcp:read:full", "mcp:simulate"] as never };

// Age 60 this year, whatever year the test runs in.
const birthYear = new Date().getUTCFullYear() - 60;

const saver: BuildContextPackInput = {
  ...emptyUser,
  birthYear,
  accounts: [
    { id: "pen", name: "Work pension", type: "Pension", balance: 100_000 },
    {
      id: "joint",
      name: "Joint saver",
      type: "Saving",
      balance: 40_000,
      ownership: "joint",
      sharePercent: 50,
    },
    { id: "home", name: "Home", type: "Property", balance: 300_000 },
  ],
  retirementPlan: {
    retirementAge: 60,
    planToAge: 80,
    target: { kind: "typed", yearlyAmount: 20_000 },
    housingOverride: null,
    statePensionAge: 67,
    statePensionAnnualForecastGbp: 11_000,
    statePensionQualifyingYears: null,
    growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
    inflationRate: 0.02,
    cashSavingsNominalRate: 0.02,
    realRentGrowthRate: 0,
    excludedAccountIds: ["joint"],
  },
};

describe("retirement MCP tools read the saved plan", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const call = async (name: string, args: Record<string, unknown> = {}) =>
    (await h?.callJson(name, args)) as Env;

  it("get_retirement_picture returns null figures and asks for each missing detail, never a placeholder", async () => {
    h = await connectTestClient(
      { ...emptyUser, accounts: [{ id: "pen", type: "Pension", balance: 10_000 }] },
      { token: FULL },
    );
    const e = await call("get_retirement_picture");
    expect(e.result.estimatedYearlyIncomeGbp).toBeNull();
    expect(e.result.retirementAge).toBeNull();
    expect(e.result.planToAge).toBeNull();
    expect(e.result.currentAge).toBeNull();
    expect(e.missing.map((m) => m.field)).toEqual(["birthYear", "retirementAge", "planToAge"]);
    expect(collectToolOutputViolations(e)).toEqual([]);
  });

  it("with no plan saved (retirementPlan null) both tools return null figures and the missing list", async () => {
    h = await connectTestClient({ ...saver, retirementPlan: null }, { token: FULL });
    for (const tool of ["get_retirement_picture", "simulate_retirement"]) {
      const e = await call(tool);
      expect(e.result.estimatedYearlyIncomeGbp, tool).toBeNull();
      expect(e.result.incomeFromStatePensionAgeGbp, tool).toBeNull();
      expect(e.result.retirementAge, tool).toBeNull();
      expect(e.result.planToAge, tool).toBeNull();
      expect(e.result.currentAge, tool).toBe(60);
      expect(
        e.missing.map((m) => m.field),
        tool,
      ).toEqual(expect.arrayContaining(["retirementAge", "planToAge"]));
      expect(
        e.missing.map((m) => m.field),
        tool,
      ).not.toContain("birthYear");
      expect(collectToolOutputViolations(e), tool).toEqual([]);
    }
  });

  it("get_retirement_picture uses the saved plan: income before and from State Pension age", async () => {
    h = await connectTestClient(saver, { token: FULL });
    const e = await call("get_retirement_picture");
    // Joint saver is excluded and property never counts: pot £100,000, at real 0% from 60 to 80
    // gives 100,000 ÷ 20 = £5,000 a year; from 67 add £11,000 = £16,000.
    // Target £20,000: differences −15,000 and −4,000.
    expect(e.result.currentCountedPotGbp).toBe(100_000);
    expect(e.result.estimatedYearlyIncomeGbp.middle).toBe(5_000);
    expect(e.result.incomeBeforeStatePensionAgeGbp.middle).toBe(5_000);
    expect(e.result.incomeFromStatePensionAgeGbp.middle).toBe(16_000);
    expect(e.result.differenceBeforeStatePensionAgeGbp.middle).toBe(-15_000);
    expect(e.result.differenceFromStatePensionAgeGbp.middle).toBe(-4_000);
    expect(e.result.statePensionAge).toBe(67);
    expect(e.missing).toEqual([]);
    const rates = e.assumptions.find((a) => a.field === "growthRates");
    expect(rates?.value).toBe("2%, 2%, 2% a year before inflation; 2% inflation");
  });

  it("simulate_retirement applies inputs on top of the saved plan", async () => {
    h = await connectTestClient(saver, { token: FULL });
    const e = await call("simulate_retirement", { retirementAge: 70 });
    // Retiring at 70 (after State Pension age): 100,000 ÷ 10 = 10,000 + 11,000 = £21,000.
    expect(e.result.retirementAge).toBe(70);
    expect(e.result.incomeBeforeStatePensionAgeGbp).toBeNull();
    expect(e.result.estimatedYearlyIncomeGbp.middle).toBe(21_000);
    // The saved plan is unchanged: a read afterwards still uses 60.
    const read = await call("get_retirement_picture");
    expect(read.result.retirementAge).toBe(60);
  });

  it("leaves the State Pension out and asks for its age when none is saved", async () => {
    h = await connectTestClient(
      {
        ...saver,
        retirementPlan: { ...(saver.retirementPlan as object), statePensionAge: null } as never,
      },
      { token: FULL },
    );
    const e = await call("get_retirement_picture");
    expect(e.result.statePensionIncluded).toBe(false);
    expect(e.result.incomeFromStatePensionAgeGbp).toBeNull();
    expect(e.result.estimatedYearlyIncomeGbp.middle).toBe(5_000);
    const ask = e.missing.find((m) => m.field === "statePensionAge");
    expect(ask?.askUser).toContain("https://www.gov.uk/state-pension-age");
  });
});
