import {
  calculateForecast,
  type LifeEventScenario,
  type LifeEventType,
} from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerContext } from "../types.js";

const lifeEventEnum = z.enum([
  "BUY_HOME",
  "HAVE_CHILD",
  "REMORTGAGE_SHOCK",
  "REMORTGAGE_RATE_SHOCK",
  "EARLY_RETIRE_57",
  "RETIRE_EARLY_BRIDGE",
]);

export const lifeEventsSchema = {
  horizonYears: z
    .number()
    .min(1)
    .max(40)
    .default(30)
    .describe("Projection time horizon in years (1 to 40 years)"),
  monthlySavingsGbp: z
    .number()
    .min(0)
    .default(500)
    .describe("Monthly surplus allocated to cash savings and ISA compounding"),
  expectedReturnPct: z
    .number()
    .min(0)
    .max(15)
    .default(6.0)
    .describe("Expected annual ISA/investment portfolio return percentage"),
  lifeEvents: z
    .array(lifeEventEnum)
    .default([])
    .describe("Preset UK life events to apply to the trajectory"),
  customScenarios: z
    .array(
      z.object({
        id: z.string().default("custom_event"),
        type: lifeEventEnum.default("BUY_HOME"),
        title: z.string(),
        startYear: z.number().min(1),
        durationYears: z.number().min(1).default(1),
        lumpSumCostGbp: z.number().min(0).default(0),
        ongoingMonthlyDeltaGbp: z.number().default(0),
      }),
    )
    .optional()
    .describe("Custom life event overrides with explicit costs and years"),
};

export function registerLifeEventsTool(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  server.registerTool(
    "project_wealth_scenario",
    {
      description:
        "Projects long-term (1-30+ year) UK net worth trajectories, compound ISA & pension growth, and models life event impacts (Home Purchase deposit, Nursery/Childcare costs, Remortgage rate shocks, Early retirement bridges).",
      inputSchema: lifeEventsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const ctx = await getContext();
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId);
      const b = rawData.baseline;

      // Map life event presets
      const scenarios: LifeEventScenario[] = [];

      for (const event of args.lifeEvents) {
        if (event === "BUY_HOME") {
          scenarios.push({
            id: "buy_home_preset",
            type: "BUY_HOME",
            title: "First Home Purchase",
            startYear: 3,
            durationYears: 1,
            lumpSumCostGbp: 40000,
            ongoingMonthlyDeltaGbp: 300,
          });
        } else if (event === "HAVE_CHILD") {
          scenarios.push({
            id: "have_child_preset",
            type: "HAVE_CHILD",
            title: "Childcare & Nursery Costs",
            startYear: 2,
            durationYears: 4,
            lumpSumCostGbp: 3000,
            ongoingMonthlyDeltaGbp: 850,
          });
        } else if (event === "REMORTGAGE_SHOCK" || event === "REMORTGAGE_RATE_SHOCK") {
          scenarios.push({
            id: "remortgage_shock_preset",
            type: "REMORTGAGE_RATE_SHOCK",
            title: "Remortgage Rate Shock (+2.5%)",
            startYear: 2,
            durationYears: 5,
            ongoingMonthlyDeltaGbp: 350,
          });
        } else if (event === "EARLY_RETIRE_57" || event === "RETIRE_EARLY_BRIDGE") {
          scenarios.push({
            id: "retire_early_preset",
            type: "RETIRE_EARLY_BRIDGE",
            title: "Early Retirement ISA Bridge (Age 57)",
            startYear: Math.max(1, 57 - (b.age ?? 32)),
            durationYears: 10,
            ongoingMonthlyDeltaGbp: -1500,
          });
        }
      }

      if (args.customScenarios && args.customScenarios.length > 0) {
        for (const cs of args.customScenarios) {
          const mappedType: LifeEventType =
            cs.type === "REMORTGAGE_SHOCK"
              ? "REMORTGAGE_RATE_SHOCK"
              : cs.type === "EARLY_RETIRE_57"
                ? "RETIRE_EARLY_BRIDGE"
                : (cs.type as LifeEventType);

          scenarios.push({
            id: cs.id,
            type: mappedType,
            title: cs.title,
            startYear: cs.startYear,
            durationYears: cs.durationYears,
            lumpSumCostGbp: cs.lumpSumCostGbp,
            ongoingMonthlyDeltaGbp: cs.ongoingMonthlyDeltaGbp,
          });
        }
      }

      const totalCash = b.totalCashSavings ?? 5000;
      const totalPension = b.totalPensionPot ?? 15000;
      const totalDebt = b.totalUnsecuredDebt ?? 0;
      const propertyEquity = Math.max(0, (b.propertyValue ?? 0) - (b.mortgageBalance ?? 0));

      const forecast = calculateForecast({
        currentAge: b.age ?? 32,
        initialCashGbp: totalCash,
        initialIsaGbp: Math.max(0, totalCash - 5000),
        initialPensionGbp: totalPension,
        initialDebtGbp: totalDebt,
        initialPropertyEquityGbp: propertyEquity,
        monthlySavingsGbp: args.monthlySavingsGbp,
        monthlyPensionContributionGbp:
          (b.annualGrossSalary * (b.pensionContributionPct / 100)) / 12,
        annualIsaReturnPct: args.expectedReturnPct,
        projectionYears: args.horizonYears,
        scenarios,
      });

      // Find net worth milestones
      const milestones: Record<string, number | string> = {};
      const milestoneValues = [100000, 250000, 500000, 1000000];

      for (const target of milestoneValues) {
        const found = forecast.trajectory.find((t) => t.scenarioNetWorthGbp >= target);
        const label = `£${(target / 1000).toLocaleString("en-GB")}k`;
        milestones[label] = found ? `Year ${found.year} (Age ${found.age})` : "Beyond horizon";
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                startingNetWorthGbp: forecast.startingNetWorthGbp,
                tenYearBaselineGbp: forecast.tenYearNetWorthBaselineGbp,
                tenYearScenarioGbp: forecast.tenYearNetWorthScenarioGbp,
                thirtyYearBaselineGbp: forecast.thirtyYearNetWorthBaselineGbp,
                thirtyYearScenarioGbp: forecast.thirtyYearNetWorthScenarioGbp,
                milestones,
                appliedScenariosCount: scenarios.length,
                trajectorySummary: forecast.trajectory
                  .filter((t) => t.year === 0 || t.year % 5 === 0 || t.year === args.horizonYears)
                  .map((t) => ({
                    year: t.year,
                    age: t.age,
                    netWorthGbp: t.scenarioNetWorthGbp,
                    isaBalanceGbp: t.isaBalanceGbp,
                    pensionBalanceGbp: t.pensionBalanceGbp,
                    debtBalanceGbp: t.debtBalanceGbp,
                    propertyEquityGbp: t.propertyEquityGbp,
                  })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
