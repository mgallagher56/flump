import {
  calculateForecast,
  contributionMonthlyFromPercent,
  isFigureKnown,
  type LifeEventScenario,
  type NetWorthLeftOut,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  ASK_NO_ACCOUNTS,
  askSalaryForPension,
  loadReadModel,
  type Missing,
  missingLinkedLines,
  sanitiseText,
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

/** Neutral notes for what the user's net worth choices leave out of the estimate. */
function netWorthBasisLeavesOutNotes(
  basis: { countProperty: boolean; countStudentLoan: boolean },
  leftOut: readonly NetWorthLeftOut[],
): string[] {
  const notes: string[] = [];
  if (!basis.countProperty && (leftOut.includes("property") || leftOut.includes("mortgage"))) {
    notes.push(
      "Property and mortgages are not counted in net worth under the user's choices, so they are left out of the estimate.",
    );
  }
  if (!basis.countStudentLoan && leftOut.includes("studentLoan")) {
    notes.push(
      "Student loans are not counted in net worth under the user's choices, so they are left out of the estimate.",
    );
  }
  if (leftOut.includes("homeValueMissing")) {
    notes.push(
      "A mortgage has no home value saved beside it, so the starting net worth counts the mortgage without the home's value.",
    );
  }
  return notes;
}
const MAX_HORIZON_YEARS = 40;

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
  title: "Estimate future net worth",
  description:
    "Estimates net worth year by year from the recorded account balances, with and without up to 10 events that each carry a one-off cost, a monthly cost or both. The expected investment return is required. Monthly saving defaults to the amount left over in the budget when a budget exists and is otherwise reported in missing[] and set to zero. Cash (4%), pension (6.5%) and property (2.5%) growth use those rates unless supplied; each is listed in assumptions. Mortgage repayments are not modelled, so equity grows only with property growth. Concise format returns every fifth year; detailed adds the balance breakdown.",
  input: {
    horizonYears: z.number().int().min(1).max(MAX_HORIZON_YEARS).default(10),
    expectedReturnPct: pctInput(
      "Assumed constant annual return on investments, as a percentage (5 means 5%). No default.",
    ),
    monthlySavingGbp: gbpInput(
      "Amount saved each month, in GBP. Defaults to the amount left over in the budget.",
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
    const earlyNotes: string[] = [];
    if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);

    let saving = input.monthlySavingGbp;
    if (saving !== undefined) {
      assumptions.push(
        agentSupplied("monthlySavingGbp", saving, "Monthly saving supplied in the call."),
      );
    } else {
      // The picture's left over each month: the figure the Budget page shows. Unknown when there
      // is no income entry or a linked line's saved fact is not set.
      const budget = isFigureKnown(m.picture.budget) ? m.picture.budget.value : null;
      if (budget?.hasIncome) {
        const surplus = round2(budget.surplus);
        saving = Math.max(0, surplus);
        assumptions.push(
          derived(
            "monthlySavingGbp",
            "The amount left over each month in the budget: income minus spending and saving rows. Minimum debt payments and pension contributions are not deducted or added, so the figure assumes the budget already includes them.",
            surplus,
          ),
        );
        if (surplus < 0) {
          earlyNotes.push("The budget is short each month, so zero saving was used.");
        }
      } else {
        saving = 0;
        missing.push(...missingLinkedLines(m.picture.budgetRows));
        missing.push({
          field: "monthlySavingGbp",
          why: "No income entry in the budget and no monthly saving supplied, so zero saving was used.",
          askUser: "What monthly saving would you like the estimate to use?",
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

    // Without a saved salary the pounds are not known, so no contribution is added to the
    // projection (never an invented amount). When a rate above 0% is saved, the agent is told the
    // contribution is left out and asked for the salary (system audit leftovers, item 1).
    const pensionFromSalary = contributionMonthlyFromPercent(base?.pensionContributionPct, {
      annualSalary: base?.annualGrossSalary,
    });
    const salaryAsk = askSalaryForPension(m.raw);
    if (salaryAsk && !missing.some((x) => x.field === salaryAsk.field)) missing.push(salaryAsk);
    const monthlyPension = pensionFromSalary ?? 0;
    if (monthlyPension > 0) {
      assumptions.push(
        fromProfile(
          "monthlyPensionContributionGbp",
          round2(monthlyPension),
          "Saved salary times pension contribution percentage, divided by 12.",
        ),
      );
    }

    // Property equity only when net worth counts property (the user's choice), as on every page.
    const nw = m.picture.netWorth;
    const equity = m.basis.countProperty
      ? Math.max(0, s.getTotalProperty() - s.getTotalMortgageBalance())
      : 0;
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
    // The start is the picture's net worth under the user's basis (AI-8). Whatever the model does
    // not grow (a counted student loan, negative equity, a mortgage with no home value, other
    // assets) is held at today's amount in every year, so year 0 equals the figure the pages show.
    const startingNetWorth = round2(nw.netWorth);
    const heldFlat = round2(startingNetWorth - forecast.startingNetWorthGbp);
    const at = (v: number) => round2(v + heldFlat);
    const last = forecast.trajectory[forecast.trajectory.length - 1];
    const notes = [
      ...earlyNotes,
      ...netWorthBasisLeavesOutNotes(m.basis, m.netWorthLeavesOut),
      ...(heldFlat !== 0
        ? [
            `${heldFlat < 0 ? "-" : ""}£${Math.abs(heldFlat).toLocaleString("en-GB")} of today's net worth (such as a counted student loan, negative equity or other things you own) is not modelled, so it is held at today's amount in every year.`,
          ]
        : []),
      "The estimate assumes saving pays down debt first, then goes to investments (up to £20,000 a year) and cash.",
      "Mortgage and student loan repayments and inflation are not modelled.",
    ];

    return {
      result: {
        horizonYears: input.horizonYears,
        startingNetWorthGbp: startingNetWorth,
        endBaselineNetWorthGbp: at(last?.baselineNetWorthGbp ?? forecast.startingNetWorthGbp),
        endScenarioNetWorthGbp: at(last?.scenarioNetWorthGbp ?? forecast.startingNetWorthGbp),
        eventsApplied: scenarios.map((e) => ({
          label: e.title,
          startYear: e.startYear,
          durationYears: e.durationYears ?? 1,
          lumpSumCostGbp: e.lumpSumCostGbp ?? 0,
          monthlyCostGbp: e.ongoingMonthlyDeltaGbp,
        })),
        points: shown.map((t) => ({
          year: t.year,
          baselineNetWorthGbp: at(t.baselineNetWorthGbp),
          scenarioNetWorthGbp: at(t.scenarioNetWorthGbp),
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
