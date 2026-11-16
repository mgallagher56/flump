import {
  calculateRetirementPlan,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { loadReadModel, round2 } from "../read/common.js";
import {
  type Assumption,
  agentSupplied,
  defaulted,
  gbpInput,
  pctInput,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

const bandSchema = z.object({
  lower: z.number(),
  middle: z.number(),
  higher: z.number(),
});

const result = z.object({
  retirementAge: z.number(),
  planToAge: z.number(),
  currentCountedPotGbp: z.number(),
  projectedPotAtRetirementGbp: bandSchema,
  estimatedYearlyIncomeGbp: bandSchema,
  targetYearlyIncomeGbp: z.number().nullable(),
  differenceYearlyGbp: bandSchema.nullable(),
  statePensionAnnualGbp: z.number(),
  housingAverageAnnualGbp: z.number(),
  notes: z.array(z.string()),
});

export const simulateRetirement = defineFlumpTool({
  name: "simulate_retirement",
  title: "Simulate retirement plan",
  description:
    "Simulates estimated yearly retirement income in today's prices from counted accounts with optional overrides for retirement age, plan-to age, extra monthly contribution, growth rates, inflation, State Pension, and the user's own target. Saves nothing.",
  annotations: SIMULATE_ANNOTATIONS,
  input: {
    retirementAge: z.number().int().min(18).max(100).describe("Retirement age to simulate."),
    planToAge: z
      .number()
      .int()
      .min(19)
      .max(120)
      .default(90)
      .describe("Age to plan income to. Defaults to 90."),
    targetYearlyGbp: gbpInput(
      "The user's own yearly retirement target in today's prices, if supplied.",
      1_000_000,
    ).optional(),
    extraMonthlyContributionGbp: gbpInput(
      "Extra monthly pension contribution in today's prices.",
      50_000,
    ).default(0),
    lowerGrowthPct: pctInput("Lower nominal annual growth percentage (default 2).").optional(),
    middleGrowthPct: pctInput("Middle nominal annual growth percentage (default 5).").optional(),
    higherGrowthPct: pctInput("Higher nominal annual growth percentage (default 8).").optional(),
    inflationPct: pctInput("Annual inflation percentage (default 2).").optional(),
    statePensionAge: z.number().int().min(50).max(85).optional(),
    statePensionQualifyingYears: z.number().int().min(0).max(50).optional(),
    statePensionAnnualForecastGbp: gbpInput(
      "User-supplied annual State Pension forecast in GBP.",
      50_000,
    ).optional(),
  },
  result,
  maxTokens: 1200,
  async handler(args, ctx) {
    const m = await loadReadModel(ctx);
    const assumptions: Assumption[] = [];

    const currentAge =
      typeof m.raw.baseline?.age === "number" && Number.isInteger(m.raw.baseline.age)
        ? m.raw.baseline.age
        : 35;
    if (typeof m.raw.baseline?.age !== "number") {
      assumptions.push(defaulted("currentAge", currentAge, "No saved age; defaulted to 35."));
    }

    const retirementAge = Math.max(currentAge, args.retirementAge);
    const planToAge = Math.max(retirementAge + 1, args.planToAge);
    assumptions.push(agentSupplied("retirementAge", retirementAge, "Supplied for simulation."));
    assumptions.push(agentSupplied("planToAge", planToAge, "Supplied for simulation."));

    const lower =
      args.lowerGrowthPct !== undefined
        ? args.lowerGrowthPct / 100
        : DEFAULT_RETIREMENT_GROWTH_CASES.lower;
    const middle =
      args.middleGrowthPct !== undefined
        ? args.middleGrowthPct / 100
        : DEFAULT_RETIREMENT_GROWTH_CASES.middle;
    const higher =
      args.higherGrowthPct !== undefined
        ? args.higherGrowthPct / 100
        : DEFAULT_RETIREMENT_GROWTH_CASES.higher;
    const inflationRate =
      args.inflationPct !== undefined ? args.inflationPct / 100 : DEFAULT_RETIREMENT_INFLATION_RATE;

    const accounts = m.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.rawType,
      balanceGbp: a.nominalBalance,
      monthlyContributionGbp: a.monthlyContribution,
      interestRatePct: a.interestRateKnown ? a.interestRate : null,
    }));

    const plan = calculateRetirementPlan({
      currentAge,
      retirementAge,
      planToAge,
      accounts,
      additionalMonthlyPensionContributionGbp: args.extraMonthlyContributionGbp,
      target:
        args.targetYearlyGbp !== undefined
          ? { kind: "typed", yearlyAmount: args.targetYearlyGbp }
          : null,
      statePension: {
        statePensionAge: args.statePensionAge,
        qualifyingYears: args.statePensionQualifyingYears,
        annualForecastGbp: args.statePensionAnnualForecastGbp,
      },
      assumptions: {
        growthRates: { lower, middle, higher },
        inflationRate,
      },
    });

    return {
      result: {
        retirementAge: plan.retirementAge,
        planToAge: plan.planToAge,
        currentCountedPotGbp: round2(plan.currentCountedPotGbp),
        projectedPotAtRetirementGbp: {
          lower: round2(plan.projectedPotAtRetirementGbp.lower),
          middle: round2(plan.projectedPotAtRetirementGbp.middle),
          higher: round2(plan.projectedPotAtRetirementGbp.higher),
        },
        estimatedYearlyIncomeGbp: {
          lower: round2(plan.estimatedYearlyIncomeGbp.lower),
          middle: round2(plan.estimatedYearlyIncomeGbp.middle),
          higher: round2(plan.estimatedYearlyIncomeGbp.higher),
        },
        targetYearlyIncomeGbp:
          plan.targetYearlyIncome === null ? null : round2(plan.targetYearlyIncome),
        differenceYearlyGbp: plan.differenceYearly
          ? {
              lower: round2(plan.differenceYearly.lower),
              middle: round2(plan.differenceYearly.middle),
              higher: round2(plan.differenceYearly.higher),
            }
          : null,
        statePensionAnnualGbp: round2(plan.statePension.annualAmountGbp),
        housingAverageAnnualGbp: round2(plan.housing.averageAnnualCostGbp),
        notes: [SIMULATION_NOTICE, "Figures are in today's prices before tax. Nothing was saved."],
      },
      missing: [],
      assumptions,
      notice: SIMULATION_NOTICE,
    };
  },
});
