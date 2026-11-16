import {
  calculateRetirementPlan,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  doesAccountCountTowardsRetirement,
  MCP_NOTICE,
  selectRetirementCountedSeries,
  toSnapshotRows,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { ASK_NO_ACCOUNTS, loadReadModel, type Missing, round2 } from "./common.js";

const bandSchema = z.object({
  lower: z.number(),
  middle: z.number(),
  higher: z.number(),
});

const result = z.object({
  currentAge: z.number(),
  retirementAge: z.number(),
  planToAge: z.number(),
  currentCountedPotGbp: z.number(),
  projectedPotAtRetirementGbp: bandSchema,
  estimatedYearlyIncomeGbp: bandSchema,
  targetYearlyIncomeGbp: z.number().nullable(),
  differenceYearlyGbp: bandSchema.nullable(),
  statePensionAnnualGbp: z.number(),
  statePensionAge: z.number(),
  housingKind: z.string(),
  housingAverageAnnualGbp: z.number(),
  assumptions: z.object({
    growthRates: bandSchema,
    inflationRate: z.number(),
    realRentGrowthRate: z.number(),
  }),
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

export function retirementHousingFromReadModel(m: Awaited<ReturnType<typeof loadReadModel>>) {
  const mortgage = m.accounts.find((a) => a.category === "mortgages");
  const housingStatusRaw = m.raw.baseline?.housingStatus?.toLowerCase();
  const housingStatus: "renting" | "mortgage" | "own_outright" | "living_with_family" | null =
    housingStatusRaw === "renting"
      ? "renting"
      : housingStatusRaw === "mortgage"
        ? "mortgage"
        : housingStatusRaw === "own_outright"
          ? "own_outright"
          : housingStatusRaw === "living_with_family"
            ? "living_with_family"
            : null;

  return {
    housingStatus,
    mortgage: mortgage
      ? {
          balanceGbp: mortgage.nominalBalance,
          interestRateApr: mortgage.interestRateKnown ? mortgage.interestRate : 4.5,
          monthlyPaymentGbp: mortgage.monthlyContributionKnown
            ? mortgage.monthlyContribution
            : null,
        }
      : null,
  };
}

export const getRetirementPicture = defineFlumpTool({
  name: "get_retirement_picture",
  title: "Retirement plan estimate",
  description:
    "Estimates yearly retirement income in today's prices from counted accounts, saved housing details, and State Pension against the user's own target. Never proposes a target. Includes the monthly counted-pots history series with carried-forward flags.",
  input: {
    retirementAge: z
      .number()
      .int()
      .min(18)
      .max(100)
      .optional()
      .describe("Target retirement age. Defaults to 67 when omitted and reported in assumptions."),
    planToAge: z
      .number()
      .int()
      .min(19)
      .max(120)
      .optional()
      .describe("Age to plan income to. Defaults to 90 when omitted and reported in assumptions."),
    targetYearlyGbp: z
      .number()
      .min(0)
      .max(1_000_000)
      .optional()
      .describe("The user's own yearly retirement target in today's prices, if stated."),
  },
  result,
  maxTokens: 1500,
  async handler({ retirementAge, planToAge, targetYearlyGbp }, ctx) {
    const m = await loadReadModel(ctx);
    const missing: Missing[] = [];
    const assumptions: Array<{
      field: string;
      value?: string | number;
      source: "default" | "user_profile" | "derived";
      reason: string;
    }> = [];

    if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);

    const currentAge =
      typeof m.raw.baseline?.age === "number" && Number.isInteger(m.raw.baseline.age)
        ? m.raw.baseline.age
        : 35;
    if (typeof m.raw.baseline?.age !== "number") {
      assumptions.push({
        field: "currentAge",
        value: currentAge,
        source: "default",
        reason: "No age is saved on the profile; 35 used as a placeholder.",
      });
    } else {
      assumptions.push({
        field: "currentAge",
        value: currentAge,
        source: "user_profile",
        reason: "Saved age.",
      });
    }

    const resolvedRetAge = retirementAge ?? Math.max(currentAge + 1, 67);
    if (retirementAge === undefined) {
      missing.push({
        field: "retirementAge",
        why: "No retirement age is saved.",
        askUser: "What age do you plan to retire?",
      });
      assumptions.push({
        field: "retirementAge",
        value: resolvedRetAge,
        source: "default",
        reason: "Defaulted to 67 for the estimate.",
      });
    }

    const resolvedPlanToAge = planToAge ?? Math.max(resolvedRetAge + 1, 90);
    if (planToAge === undefined) {
      missing.push({
        field: "planToAge",
        why: "No plan-to age is saved.",
        askUser: "What age would you like to plan your retirement income to?",
      });
      assumptions.push({
        field: "planToAge",
        value: resolvedPlanToAge,
        source: "default",
        reason: "Defaulted to 90 for the estimate.",
      });
    }

    if (targetYearlyGbp === undefined) {
      missing.push({
        field: "targetYearlyGbp",
        why: "No yearly retirement target is saved.",
        askUser: "What yearly retirement income (in today's prices) is your own target?",
      });
    }

    assumptions.push({
      field: "growthRates",
      value: "2% / 5% / 8% nominal, 2% inflation",
      source: "default",
      reason: "Reference three-case band in today's prices.",
    });

    const accounts = m.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.rawType,
      balanceGbp: a.nominalBalance,
      monthlyContributionGbp: a.monthlyContribution,
      interestRatePct: a.interestRateKnown ? a.interestRate : null,
    }));

    const housing = retirementHousingFromReadModel(m);

    const plan = calculateRetirementPlan({
      currentAge,
      retirementAge: resolvedRetAge,
      planToAge: resolvedPlanToAge,
      accounts,
      target:
        targetYearlyGbp !== undefined ? { kind: "typed", yearlyAmount: targetYearlyGbp } : null,
      housing,
      assumptions: {
        growthRates: DEFAULT_RETIREMENT_GROWTH_CASES,
        inflationRate: DEFAULT_RETIREMENT_INFLATION_RATE,
      },
    });

    const countedAccounts = accounts
      .filter((a) => doesAccountCountTowardsRetirement(a))
      .map((a) => ({ ...a, id: String(a.id) }));
    const snapshotRows = toSnapshotRows(m.raw.accountDetails ?? []);
    const monthlySeries = selectRetirementCountedSeries(countedAccounts, snapshotRows)
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
        currentAge: plan.currentAge,
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
        statePensionAge: plan.statePension.statePensionAge,
        housingKind: plan.housing.kind,
        housingAverageAnnualGbp: round2(plan.housing.averageAnnualCostGbp),
        assumptions: {
          growthRates: plan.assumptions.growthRates,
          inflationRate: plan.assumptions.inflationRate,
          realRentGrowthRate: plan.assumptions.realRentGrowthRate,
        },
        monthlySeries,
        notes: [
          MCP_NOTICE,
          "Figures are in today's prices before tax and use the user's own target when provided.",
        ],
      },
      missing,
      assumptions,
      notice: MCP_NOTICE,
    };
  },
});
