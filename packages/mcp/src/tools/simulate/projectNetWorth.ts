import { calculateForecast, type LifeEventScenario } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  ASK_NO_ACCOUNTS,
  loadReadModel,
  type Missing,
  sanitiseText,
  summariseBudget,
} from "../read/common.js";
import {
  agentSupplied,
  defaulted,
  derived,
  fromProfile,
  gbpInput,
  pctInput,
  round2,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

export const MAX_EVENTS = 10;
export const MAX_HORIZON_YEARS = 40;

const event = z.object({
  label: z.string().min(1).max(40).describe("Short name, for example Car"),
  startYear: z
    .number()
    .int()
    .min(1)
    .max(MAX_HORIZON_YEARS)
    .describe("Years from now when it starts"),
  durationYears: z
    .number()
    .int()
    .min(1)
    .max(MAX_HORIZON_YEARS)
    .default(1)
    .describe("Years the monthly cost lasts"),
  lumpSumCostGbp: gbpInput("One-off cost at the start, in GBP").default(0),
  monthlyCostGbp: gbpInput("Extra cost each month while it lasts, in GBP", 100_000).default(0),
  becomesPropertyEquity: z
    .boolean()
    .default(false)
    .describe("True when the one-off cost buys property (it then counts as equity, not spend)"),
});

const point = z.object({
  year: z.number(),
  baselineNetWorthGbp: z.number(),
  scenarioNetWorthGbp: z.number(),
  cashGbp: z.number().optional(),
  investmentsGbp: z.number().optional(),
  pensionGbp: z.number().optional(),
  propertyEquityGbp: z.number().optional(),
  debtGbp: z.number().optional(),
});

const result = z.object({
  horizonYears: z.number(),
  startingNetWorthGbp: z.number(),
  endBaselineNetWorthGbp: z.number(),
  endScenarioNetWorthGbp: z.number(),
  eventsApplied: z.array(
    z.object({
      label: z.string(),
      startYear: z.number(),
      durationYears: z.number(),
      lumpSumCostGbp: z.number(),
      monthlyCostGbp: z.number(),
    }),
  ),
  points: z.array(point),
  notes: z.array(z.string()),
});

export const projectNetWorth = defineFlumpTool({
  name: "project_net_worth",
  title: "Project net worth",
  description:
    "Projects net worth year by year from the recorded account balances, with and without up to 10 events that each carry an explicit one-off and/or monthly cost. The expected investment return is required. Monthly saving defaults to the budget surplus when a budget exists and is otherwise reported in missing[] and set to zero. Cash, pension and property growth use fixed stated rates unless supplied. Mortgage repayments are not modelled, so equity grows only with property growth. Concise format returns every fifth year; detailed adds the balance breakdown.",
  input: {
    horizonYears: z.number().int().min(1).max(MAX_HORIZON_YEARS).default(10),
    expectedReturnPct: pctInput(
      "Assumed constant annual return on investments, as a percentage (5 means 5%). No default.",
    ),
    monthlySavingGbp: gbpInput(
      "Amount saved each month, in GBP. Defaults to the budget surplus.",
      100_000,
    ).optional(),
    cashInterestPct: pctInput(
      "Annual interest on cash, as a percentage. Defaults to 4.",
    ).optional(),
    pensionReturnPct: pctInput(
      "Annual pension growth, as a percentage. Defaults to 6.5.",
    ).optional(),
    propertyGrowthPct: pctInput(
      "Annual property growth, as a percentage. Defaults to 2.5.",
    ).optional(),
    events: z.array(event).max(MAX_EVENTS).default([]),
  },
  result,
  maxTokens: 2500,
  annotations: SIMULATE_ANNOTATIONS,
  async handler(input, ctx, { responseFormat }) {
    const m = await loadReadModel(ctx);
    const s = m.snapshot;
    const base = m.raw.baseline;
    const assumptions = [
      agentSupplied("horizonYears", input.horizonYears, "Years projected."),
      agentSupplied(
        "expectedReturnPct",
        input.expectedReturnPct,
        "Constant annual investment return.",
      ),
    ];
    const missing: Missing[] = [];
    if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);

    let saving = input.monthlySavingGbp;
    if (saving !== undefined) {
      assumptions.push(
        agentSupplied("monthlySavingGbp", saving, "Monthly saving supplied in the call."),
      );
    } else {
      const budget = summariseBudget(m.raw.budgetEntries ?? []);
      if (budget.monthlyIncome !== null) {
        saving = Math.max(
          0,
          round2(budget.monthlyIncome - budget.essentialMonthly - budget.discretionaryMonthly),
        );
        assumptions.push(
          derived(
            "monthlySavingGbp",
            "Budget income minus essential and discretionary spending, before debt payments.",
            saving,
          ),
        );
      } else {
        saving = 0;
        missing.push({
          field: "monthlySavingGbp",
          why: "No income entry in the budget and no monthly saving supplied, so zero saving was used.",
          askUser: "How much can you save each month?",
        });
      }
    }

    const rates = {
      cash: input.cashInterestPct ?? 4,
      pension: input.pensionReturnPct ?? 6.5,
      property: input.propertyGrowthPct ?? 2.5,
    };
    for (const [field, value, supplied] of [
      ["cashInterestPct", rates.cash, input.cashInterestPct],
      ["pensionReturnPct", rates.pension, input.pensionReturnPct],
      ["propertyGrowthPct", rates.property, input.propertyGrowthPct],
    ] as const) {
      assumptions.push(
        supplied === undefined
          ? defaulted(field, value, "Not supplied, so the stated rate was used.")
          : agentSupplied(field, value, "Rate supplied in the call."),
      );
    }

    const salary = base?.annualGrossSalary ?? 0;
    const pensionPct = base?.pensionContributionPct ?? 0;
    const monthlyPension = salary > 0 && pensionPct > 0 ? (salary * (pensionPct / 100)) / 12 : 0;
    if (monthlyPension > 0) {
      assumptions.push(
        fromProfile(
          "monthlyPensionContributionGbp",
          round2(monthlyPension),
          "Profile salary times pension contribution percentage, divided by 12.",
        ),
      );
    }

    const equity = Math.max(0, s.getTotalProperty() - s.getTotalMortgageBalance());
    const scenarios: LifeEventScenario[] = input.events.map((e, i) => ({
      id: `event_${i + 1}`,
      // The engine only treats BUY_HOME specially (lump sum becomes equity); the other type is a plain cost.
      type: e.becomesPropertyEquity ? "BUY_HOME" : "HAVE_CHILD",
      title: sanitiseText(e.label, 40),
      startYear: e.startYear,
      durationYears: e.durationYears,
      lumpSumCostGbp: e.lumpSumCostGbp,
      ongoingMonthlyDeltaGbp: e.monthlyCostGbp,
    }));

    const forecast = calculateForecast({
      initialCashGbp: s.getTotalLiquidCash(),
      initialIsaGbp: s.getTotalInvestments(),
      initialPensionGbp: s.getTotalPensions(),
      initialDebtGbp: s.getTotalConsumerDebt(),
      initialPropertyEquityGbp: equity,
      monthlySavingsGbp: saving,
      monthlyPensionContributionGbp: monthlyPension,
      annualCashInterestPct: rates.cash,
      annualIsaReturnPct: input.expectedReturnPct,
      annualPensionReturnPct: rates.pension,
      annualPropertyGrowthPct: rates.property,
      projectionYears: input.horizonYears,
      scenarios,
    });

    const detailed = responseFormat === "detailed";
    const shown = forecast.trajectory.filter(
      (t) => detailed || t.year === 0 || t.year % 5 === 0 || t.year === input.horizonYears,
    );
    const last = forecast.trajectory[forecast.trajectory.length - 1];
    const notes = [
      "Saving goes to debt first, then to investments (up to 20,000 pounds a year) and cash.",
      "Student loans are excluded. Mortgage repayments and inflation are not modelled.",
    ];

    return {
      result: {
        horizonYears: input.horizonYears,
        startingNetWorthGbp: forecast.startingNetWorthGbp,
        endBaselineNetWorthGbp: last?.baselineNetWorthGbp ?? forecast.startingNetWorthGbp,
        endScenarioNetWorthGbp: last?.scenarioNetWorthGbp ?? forecast.startingNetWorthGbp,
        eventsApplied: scenarios.map((e) => ({
          label: e.title,
          startYear: e.startYear,
          durationYears: e.durationYears ?? 1,
          lumpSumCostGbp: e.lumpSumCostGbp ?? 0,
          monthlyCostGbp: e.ongoingMonthlyDeltaGbp,
        })),
        points: shown.map((t) => ({
          year: t.year,
          baselineNetWorthGbp: t.baselineNetWorthGbp,
          scenarioNetWorthGbp: t.scenarioNetWorthGbp,
          ...(detailed
            ? {
                cashGbp: t.cashBalanceGbp,
                investmentsGbp: t.isaBalanceGbp,
                pensionGbp: t.pensionBalanceGbp,
                propertyEquityGbp: t.propertyEquityGbp,
                debtGbp: t.debtBalanceGbp,
              }
            : {}),
        })),
        notes,
      },
      assumptions,
      missing,
      provenance: { points: "account_balances" },
      notice: SIMULATION_NOTICE,
    };
  },
});
