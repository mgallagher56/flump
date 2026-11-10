import {
  calculateDebtSchedule,
  calculateOverdraftCost,
  compareAvalancheAndSnowball,
  type DebtItem,
  filterConsumerDebts,
} from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerContext } from "../types.js";

export const debtSimulatorSchema = {
  strategy: z
    .enum(["AVALANCHE", "SNOWBALL", "COMPARE_BOTH"])
    .default("AVALANCHE")
    .describe(
      "Debt payoff algorithm to simulate (Avalanche = highest APR first, Snowball = lowest balance first)",
    ),
  monthlyExtraOverpaymentGbp: z
    .number()
    .min(0)
    .default(50)
    .describe("Extra monthly cash surplus allocated towards debt overpayments in GBP"),
  postDebtIsaReturnPct: z
    .number()
    .min(0)
    .max(20)
    .default(6.0)
    .describe("Projected annual compounding return percentage for the post-debt wealth bridge"),
  customDebtsOverride: z
    .array(
      z.object({
        id: z.string().default("custom_debt"),
        name: z.string(),
        balanceGbp: z.number().min(0),
        interestRateApr: z.number().min(0),
        minimumPaymentGbp: z.number().min(0),
        promoAprExpiryDate: z.string().optional(),
        revertApr: z.number().optional(),
        debtType: z
          .enum(["credit_card", "overdraft", "loan", "car_finance", "bnpl", "other"])
          .optional(),
      }),
    )
    .optional()
    .describe("Optional hypothetical debt items to simulate instead of the user's active accounts"),
};

export function registerDebtSimulatorTool(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  server.registerTool(
    "simulate_debt_payoff",
    {
      description:
        "Simulates deterministic UK consumer debt payoff schedules (Avalanche vs Snowball), 0% promotional transfer cliff alerts, and 5-year post-debt ISA wealth crossover projections via @flump/finance-engine.",
      inputSchema: debtSimulatorSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const ctx = await getContext();
      let debts: DebtItem[] = [];

      if (args.customDebtsOverride && args.customDebtsOverride.length > 0) {
        debts = args.customDebtsOverride.map((d, i) => ({
          id: d.id || `custom_${i}`,
          name: d.name,
          balance: d.balanceGbp,
          balanceGbp: d.balanceGbp,
          apr: d.interestRateApr,
          interestRateApr: d.interestRateApr,
          minimumPayment: d.minimumPaymentGbp,
          minimumPaymentGbp: d.minimumPaymentGbp,
          promoAprExpiryDate: d.promoAprExpiryDate,
          revertApr: d.revertApr,
          debtType: d.debtType,
        }));
      } else {
        const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
          anonymizeInstitutions: ctx.token.anonymizeInstitutions,
        });
        const accounts = rawData.accounts ?? [];
        debts = accounts
          .filter((a) => {
            const t = (a.type || "").toLowerCase();
            return (
              t.includes("credit") ||
              t.includes("loan") ||
              t.includes("owed") ||
              t.includes("overdraft")
            );
          })
          .map((a, i) => {
            const nominal = Math.abs(Number(a.balance) || 0);
            const apr = Number(a.interestRate) || 19.9;
            const min = Math.max(25, Math.round(nominal * 0.025));
            return {
              id: a.id || `debt_${i}`,
              name: a.name || `Debt Account #${i + 1}`,
              balance: nominal,
              balanceGbp: nominal,
              apr,
              interestRateApr: apr,
              minimumPayment: min,
              minimumPaymentGbp: min,
            };
          });
      }

      const { consumerDebts, excludedStudentLoans } = filterConsumerDebts(debts);

      if (args.strategy === "COMPARE_BOTH") {
        const comparison = compareAvalancheAndSnowball(
          consumerDebts,
          args.monthlyExtraOverpaymentGbp,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  comparison,
                  excludedStudentLoansCount: excludedStudentLoans.length,
                  studentLoansNotice:
                    excludedStudentLoans.length > 0
                      ? "Student loans are income-contingent graduate taxes and evaluated separately from commercial debt."
                      : undefined,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const strat = args.strategy === "SNOWBALL" ? "SNOWBALL" : "AVALANCHE";
      const result = calculateDebtSchedule(consumerDebts, args.monthlyExtraOverpaymentGbp, strat, {
        expectedIsaAnnualReturnPct: args.postDebtIsaReturnPct,
      });

      // Check overdraft EAR costs if any
      const overdraftCosts = consumerDebts
        .filter((d) => d.debtType === "overdraft" || d.name.toLowerCase().includes("overdraft"))
        .map((d) => ({
          debtName: d.name,
          ...calculateOverdraftCost(d.balanceGbp, d.interestRateApr || 39.9),
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                strategy: result.strategy,
                totalStartingDebtGbp: result.totalStartingDebtGbp,
                debtFreeDate: result.debtFreeDate,
                monthsToPayoff: result.monthsToPayoff,
                totalInterestPaidGbp: result.totalInterestPaidGbp,
                interestSavedVsMinimumGbp: result.interestSavedVsMinimumGbp,
                firstQuickWinDebtName: result.firstQuickWinDebtName,
                firstQuickWinDate: result.firstQuickWinDate,
                promoCliffAlerts: result.promoCliffAlerts,
                fiveYearPostDebtWealthGbp: result.fiveYearPostDebtWealthGbp,
                overdraftAnnualCosts: overdraftCosts.length > 0 ? overdraftCosts : undefined,
                excludedStudentLoansCount: excludedStudentLoans.length,
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
