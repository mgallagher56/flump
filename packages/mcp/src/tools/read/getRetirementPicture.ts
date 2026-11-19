import {
  buildRetirementPlanInput,
  calculateRetirementPlan,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  doesAccountCountTowardsRetirement,
  MCP_NOTICE,
  type RetirementGrowthBand,
  type RetirementInputOverrides,
  retirementArgsFromContextInput,
  selectRetirementCountedSeries,
  toSnapshotRows,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import type { ToolOutput } from "../../envelope.js";
import {
  ASK_NO_ACCOUNTS,
  askSalaryForPension,
  capMissing,
  loadReadModel,
  type Missing,
  round2,
} from "./common.js";

type Assumption = NonNullable<ToolOutput<unknown>["assumptions"]>[number];

const bandSchema = z.object({
  lower: z.number(),
  middle: z.number(),
  higher: z.number(),
});

/** The figures both retirement tools return. Every estimate is null while details are missing. */
export const retirementFiguresSchema = {
  currentAge: z.number().nullable(),
  retirementAge: z.number().nullable(),
  planToAge: z.number().nullable(),
  currentCountedPotGbp: z.number(),
  /** Estimated yearly income from the retirement age (the first year of retirement). */
  estimatedYearlyIncomeGbp: bandSchema.nullable(),
  /** Pots only, from the retirement age until State Pension age; null when there is no gap. */
  incomeBeforeStatePensionAgeGbp: bandSchema.nullable(),
  /** Pots plus the State Pension, from State Pension age; null while the State Pension is left out. */
  incomeFromStatePensionAgeGbp: bandSchema.nullable(),
  projectedPotAtRetirementGbp: bandSchema.nullable(),
  targetYearlyIncomeGbp: z.number().nullable(),
  differenceYearlyGbp: bandSchema.nullable(),
  differenceBeforeStatePensionAgeGbp: bandSchema.nullable(),
  differenceFromStatePensionAgeGbp: bandSchema.nullable(),
  statePensionIncluded: z.boolean(),
  statePensionAnnualGbp: z.number().nullable(),
  statePensionAge: z.number().nullable(),
  housingKind: z.string().nullable(),
  housingAverageAnnualGbp: z.number().nullable(),
  assumptions: z.object({
    growthRates: bandSchema,
    inflationRate: z.number(),
  }),
};

const result = z.object({
  ...retirementFiguresSchema,
  monthlySeries: z.array(
    z.object({
      month: z.string(),
      totalCountedGbp: z.number(),
      hasCarriedForward: z.boolean(),
      changeFromPreviousGbp: z.number().nullable(),
    }),
  ),
  notes: z.array(z.string()),
});

const ASK: Record<string, Missing> = {
  birthYear: {
    field: "birthYear",
    why: "No birth year is saved on the profile, so the current age is not known.",
    askUser: "What year were you born? You can save it on your profile in Flump.",
  },
  retirementAge: {
    field: "retirementAge",
    why: "No retirement age is saved in the retirement plan.",
    askUser: "At what age do you plan to retire?",
  },
  planToAge: {
    field: "planToAge",
    why: "No plan-to age is saved in the retirement plan.",
    askUser: "Up to what age would you like to plan your retirement income?",
  },
  statePensionAge: {
    field: "statePensionAge",
    why: "No State Pension age is saved, so the State Pension is left out of the estimate.",
    askUser:
      "What is your State Pension age? You can check it at https://www.gov.uk/state-pension-age.",
  },
  statePensionAmount: {
    field: "statePensionAmount",
    why: "No State Pension forecast or qualifying years are saved, so the State Pension is left out of the estimate.",
    askUser:
      "What is your yearly State Pension forecast, or how many National Insurance qualifying years do you have?",
  },
  targetYearlyGbp: {
    field: "targetYearlyGbp",
    why: "No yearly retirement target is saved.",
    askUser: "What yearly retirement income, in today's prices, is your own target?",
  },
};

const pct = (rate: number) => `${round2(rate * 100)}%`;
const band = (b: RetirementGrowthBand<number> | null) =>
  b === null
    ? null
    : { lower: round2(b.lower), middle: round2(b.middle), higher: round2(b.higher) };

/**
 * Runs the saved plan, with what-if overrides on top, through the shared engine builder. Both
 * retirement tools call this, so they give the same figures as the web page.
 */
export async function runRetirementPlan(
  ctx: Parameters<typeof loadReadModel>[0],
  overrides: RetirementInputOverrides,
  now: Date = new Date(),
) {
  const m = await loadReadModel(ctx);
  const built = buildRetirementPlanInput(retirementArgsFromContextInput(m.raw, now, overrides));
  const missing: Missing[] = [];
  const assumptions: Assumption[] = [];
  if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);
  // A saved workplace rate with no salary: the contribution is left out of the estimate, and the
  // agent is told so, never a silent £0 (system audit leftovers, item 1).
  const salaryAsk = askSalaryForPension(m.raw);
  if (salaryAsk) missing.push(salaryAsk);

  const counted = built.accounts.filter((a) => doesAccountCountTowardsRetirement(a));
  const currentCountedPotGbp = round2(counted.reduce((sum, a) => sum + a.balanceGbp, 0));

  const savedPlan = m.raw.retirementPlan ?? null;
  const growthRates = {
    lower: overrides.growthRates?.lower ?? savedPlan?.growthRates?.lower,
    middle: overrides.growthRates?.middle ?? savedPlan?.growthRates?.middle,
    higher: overrides.growthRates?.higher ?? savedPlan?.growthRates?.higher,
  };

  if (!built.ok) {
    for (const field of built.missing) missing.push(ASK[field] as Missing);
  } else {
    for (const field of built.statePensionMissing) missing.push(ASK[field] as Missing);
  }

  const plan = built.ok ? calculateRetirementPlan(built.input) : null;
  if (plan && plan.targetYearlyIncome === null) missing.push(ASK.targetYearlyGbp as Missing);

  const rates = plan?.assumptions.growthRates ?? {
    lower: growthRates.lower ?? DEFAULT_RETIREMENT_GROWTH_CASES.lower,
    middle: growthRates.middle ?? DEFAULT_RETIREMENT_GROWTH_CASES.middle,
    higher: growthRates.higher ?? DEFAULT_RETIREMENT_GROWTH_CASES.higher,
  };
  const inflationRate =
    plan?.assumptions.inflationRate ??
    overrides.inflationRate ??
    savedPlan?.inflationRate ??
    DEFAULT_RETIREMENT_INFLATION_RATE;
  assumptions.push({
    field: "growthRates",
    value: `${pct(rates.lower)}, ${pct(rates.middle)}, ${pct(rates.higher)} a year before inflation; ${pct(inflationRate)} inflation`,
    source: savedPlan ? "user_profile" : "default",
    reason:
      "A reference band for the three cases, not a prediction. Figures are in today's prices.",
  });
  if (built.ok && built.retirementAgeAdjusted) {
    assumptions.push({
      field: "retirementAge",
      value: built.input.retirementAge,
      source: "derived",
      reason: "The saved retirement age is below the current age, so the current age is used.",
    });
  }

  const figures = {
    currentAge: built.currentAge,
    retirementAge: plan?.retirementAge ?? null,
    planToAge: plan?.planToAge ?? null,
    currentCountedPotGbp,
    estimatedYearlyIncomeGbp: band(plan?.estimatedYearlyIncomeGbp ?? null),
    incomeBeforeStatePensionAgeGbp: band(
      plan?.estimatedYearlyIncomeBeforeStatePensionAgeGbp ?? null,
    ),
    incomeFromStatePensionAgeGbp: band(plan?.estimatedYearlyIncomeFromStatePensionAgeGbp ?? null),
    projectedPotAtRetirementGbp: band(plan?.projectedPotAtRetirementGbp ?? null),
    targetYearlyIncomeGbp:
      plan?.targetYearlyIncome === null || plan === null ? null : round2(plan.targetYearlyIncome),
    differenceYearlyGbp: band(plan?.differenceYearly ?? null),
    differenceBeforeStatePensionAgeGbp: band(plan?.differenceBeforeStatePensionAgeYearly ?? null),
    differenceFromStatePensionAgeGbp: band(plan?.differenceFromStatePensionAgeYearly ?? null),
    statePensionIncluded: plan?.statePension != null,
    statePensionAnnualGbp: plan?.statePension ? round2(plan.statePension.annualAmountGbp) : null,
    statePensionAge: plan?.statePension?.statePensionAge ?? null,
    housingKind: plan?.housing.kind ?? null,
    housingAverageAnnualGbp: plan ? round2(plan.housing.averageAnnualCostGbp) : null,
    assumptions: { growthRates: rates, inflationRate },
  };

  return {
    m,
    counted,
    figures,
    missing: capMissing(missing, {
      field: "retirementDetails",
      why: "Several retirement plan details are not saved.",
      askUser: "Which retirement plan details would you like to add?",
    }),
    assumptions,
  };
}

export const getRetirementPicture = defineFlumpTool({
  name: "get_retirement_picture",
  title: "Retirement plan estimate",
  description:
    "Reads the user's saved retirement plan and estimates yearly retirement income in today's prices, before tax, from counted accounts, saved housing details and the State Pension details the user gave, beside the user's own target. Returns income from the retirement age and, separately, from State Pension age. Never proposes a target or fills in an age: while the birth year, retirement age or plan-to age is missing, figures are null and missing lists what to ask. Inputs replace saved values for this answer only. Includes the monthly counted-pots history.",
  input: {
    retirementAge: z
      .number()
      .int()
      .min(18)
      .max(100)
      .optional()
      .describe("Retirement age to use instead of the saved one, if the user stated it."),
    planToAge: z
      .number()
      .int()
      .min(19)
      .max(120)
      .optional()
      .describe("Plan-to age to use instead of the saved one, if the user stated it."),
    targetYearlyGbp: z
      .number()
      .min(0)
      .max(1_000_000)
      .optional()
      .describe("The user's own yearly retirement target in today's prices, if stated."),
  },
  result,
  maxTokens: 2000,
  async handler({ retirementAge, planToAge, targetYearlyGbp }, ctx) {
    const run = await runRetirementPlan(ctx, { retirementAge, planToAge, targetYearlyGbp });

    const snapshotRows = toSnapshotRows(run.m.raw.accountDetails ?? []);
    const monthlySeries = selectRetirementCountedSeries(run.counted, snapshotRows)
      .slice(-12)
      .map((pt) => ({
        month: pt.month,
        totalCountedGbp: round2(pt.totalCountedGbp),
        hasCarriedForward: pt.hasCarriedForward,
        changeFromPreviousGbp:
          pt.changeFromPreviousGbp === null ? null : round2(pt.changeFromPreviousGbp),
      }));

    return {
      result: {
        ...run.figures,
        monthlySeries,
        notes: [
          MCP_NOTICE,
          "Figures are estimates in today's prices, before tax, and use the user's own target when one is saved or stated.",
        ],
      },
      missing: run.missing,
      assumptions: run.assumptions,
      notice: MCP_NOTICE,
    };
  },
});
