import {
  type BuildContextPackInput,
  buildRetirementPlanInput,
  calculateRetirementPlan,
  DEFAULT_FINANCIAL_BASELINE,
  type RetirementSavedPlanInput,
  retirementArgsFromContextInput,
} from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { retirementArgsFromLoader } from "./retirementInput";

const NOW = new Date("2026-11-17T12:00:00Z");

const plan: RetirementSavedPlanInput = {
  retirementAge: 60,
  planToAge: 85,
  target: {
    kind: "budget",
    lineSettings: [{ budgetEntryId: "b1", status: { kind: "changes", monthlyAmount: 300 } }],
  },
  housingOverride: null,
  statePensionAge: 67,
  statePensionAnnualForecastGbp: null,
  statePensionQualifyingYears: 30,
  growthRates: { lower: 0.03, middle: 0.05, higher: 0.07 },
  inflationRate: 0.025,
  cashSavingsNominalRate: null,
  realRentGrowthRate: 0,
  excludedAccountIds: ["isa"],
};

const accounts = [
  { id: "pen", name: "Pension", type: "Pension", balance: 80_000, monthlyContribution: 400 },
  { id: "isa", name: "ISA", type: "ISA", balance: 20_000, monthlyContribution: 100 },
  {
    id: "sav",
    name: "Joint saver",
    type: "Saving",
    balance: 30_000,
    monthlyContribution: 200,
    interestRate: 4,
    ownership: "joint",
    sharePercent: 40,
  },
  {
    id: "mort",
    name: "Mortgage",
    type: "Mortgage",
    balance: -150_000,
    interestRate: 4.2,
    monthlyContribution: 900,
    termMonths: 240,
    ownership: "joint",
  },
];

const budgetEntries = [
  {
    id: "b1",
    category: "food",
    name: "Food",
    amount: 500,
    frequency: "monthly",
    isIncome: false,
    isEssential: true,
  },
  {
    id: "b2",
    category: "transport",
    name: "Car",
    amount: 200,
    frequency: "monthly",
    isIncome: false,
    isEssential: false,
  },
];

describe("retirement input parity: web page and MCP tools", () => {
  it("gives identical figures from the same saved data", () => {
    const web = buildRetirementPlanInput(
      retirementArgsFromLoader(
        {
          userProfile: { birthYear: 1981, housingStatus: "mortgage", monthlyHousingCost: 900 },
          accounts,
          budgetEntries,
          retirementPlan: plan,
        },
        NOW,
      ),
    );
    const mcpData: BuildContextPackInput = {
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u1", housingStatus: "MORTGAGE" },
      accounts,
      budgetEntries,
      profileFacts: {
        annualSalary: null,
        employmentType: null,
        taxRegion: null,
        studentLoanPlans: null,
        pensionPercent: null,
        isSalarySacrifice: null,
        housingStatus: "mortgage",
        monthlyHousingCost: 900,
      },
      netWorthBasis: { countProperty: true, countStudentLoan: false },
      retirementPlan: plan,
      birthYear: 1981,
    };
    const mcp = buildRetirementPlanInput(retirementArgsFromContextInput(mcpData, NOW));

    expect(web.ok && mcp.ok).toBe(true);
    if (!web.ok || !mcp.ok) return;
    expect(web.input).toEqual(mcp.input);
    expect(calculateRetirementPlan(web.input)).toEqual(calculateRetirementPlan(mcp.input));
  });
});
