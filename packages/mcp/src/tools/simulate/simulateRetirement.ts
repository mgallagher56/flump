import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { retirementFiguresSchema, runRetirementPlan } from "../read/getRetirementPicture.js";
import {
  type Assumption,
  agentSupplied,
  gbpInput,
  pctInput,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

const result = z.object({
  ...retirementFiguresSchema,
  notes: z.array(z.string()),
});

export const simulateRetirement = defineFlumpTool({
  name: "simulate_retirement",
  title: "Simulate retirement plan",
  description:
    "Simulates estimated yearly retirement income in today's prices, before tax, starting from the user's saved retirement plan. Each input given replaces the saved value for this answer only: retirement age, plan-to age, extra monthly contribution, growth rates, inflation, State Pension details and the user's own target. Returns income from the retirement age and, separately, from State Pension age. Never fills in an age or a State Pension amount: while details are missing, figures are null and missing lists what to ask. Saves nothing.",
  annotations: SIMULATE_ANNOTATIONS,
  input: {
    retirementAge: z
      .number()
      .int()
      .min(18)
      .max(100)
      .optional()
      .describe("Retirement age to simulate instead of the saved one."),
    planToAge: z
      .number()
      .int()
      .min(19)
      .max(120)
      .optional()
      .describe("Age to plan income to, instead of the saved one."),
    targetYearlyGbp: gbpInput(
      "The user's own yearly retirement target in today's prices, if supplied.",
      1_000_000,
    ).optional(),
    extraMonthlyContributionGbp: gbpInput(
      "Extra monthly pension contribution in today's prices.",
      50_000,
    ).optional(),
    lowerGrowthPct: pctInput("Lower nominal annual growth percentage.").optional(),
    middleGrowthPct: pctInput("Middle nominal annual growth percentage.").optional(),
    higherGrowthPct: pctInput("Higher nominal annual growth percentage.").optional(),
    inflationPct: pctInput("Annual inflation percentage.").optional(),
    statePensionAge: z
      .number()
      .int()
      .min(50)
      .max(85)
      .optional()
      .describe("The user's State Pension age, as they stated it."),
    statePensionQualifyingYears: z.number().int().min(0).max(50).optional(),
    statePensionAnnualForecastGbp: gbpInput(
      "User-supplied annual State Pension forecast in GBP.",
      50_000,
    ).optional(),
  },
  result,
  maxTokens: 1800,
  async handler(args, ctx) {
    const supplied: Assumption[] = [];
    const echo = (field: string, value: number | undefined) => {
      if (value !== undefined)
        supplied.push(agentSupplied(field, value, "Supplied for simulation."));
    };
    echo("retirementAge", args.retirementAge);
    echo("planToAge", args.planToAge);
    echo("extraMonthlyContributionGbp", args.extraMonthlyContributionGbp);
    echo("statePensionAge", args.statePensionAge);

    const toRate = (p: number | undefined) => (p === undefined ? undefined : p / 100);
    const run = await runRetirementPlan(ctx, {
      retirementAge: args.retirementAge,
      planToAge: args.planToAge,
      targetYearlyGbp: args.targetYearlyGbp,
      additionalMonthlyPensionContributionGbp: args.extraMonthlyContributionGbp,
      statePensionAge: args.statePensionAge,
      statePensionQualifyingYears: args.statePensionQualifyingYears,
      statePensionAnnualForecastGbp: args.statePensionAnnualForecastGbp,
      growthRates: {
        lower: toRate(args.lowerGrowthPct),
        middle: toRate(args.middleGrowthPct),
        higher: toRate(args.higherGrowthPct),
      },
      inflationRate: toRate(args.inflationPct),
    });

    return {
      result: {
        ...run.figures,
        notes: [
          SIMULATION_NOTICE,
          "Figures are estimates in today's prices, before tax. Nothing was saved.",
        ],
      },
      missing: run.missing,
      assumptions: [...supplied, ...run.assumptions],
      notice: SIMULATION_NOTICE,
    };
  },
});
