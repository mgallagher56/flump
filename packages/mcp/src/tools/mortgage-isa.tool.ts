import { calculateMortgageAmortization, calculateMortgageVsIsa } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerContext } from "../types.js";

export const mortgageIsaSchema = {
  monthlySurplusToAllocateGbp: z
    .number()
    .min(0)
    .default(200)
    .describe(
      "Monthly surplus cash to allocate towards either mortgage overpayment or ISA compounding",
    ),
  cashOrStocksIsaApyPct: z
    .number()
    .min(0)
    .max(20)
    .default(6.0)
    .describe(
      "Expected annual return percentage inside a tax-free UK ISA (e.g. 5.0 for Cash ISA, 7.0 for Global Equities S&S ISA)",
    ),
  targetRemortgageDate: z
    .string()
    .optional()
    .describe(
      "ISO date 'YYYY-MM-DD' of next fixed-rate mortgage expiry to evaluate LTV tier unlocking",
    ),
  hypotheticalPropertyValueGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Property market valuation in GBP (defaults to user baseline)"),
  hypotheticalMortgageBalanceGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Outstanding mortgage principal in GBP (defaults to user baseline)"),
  hypotheticalMortgageRateApr: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe("Current active mortgage APR percentage (defaults to 4.5%)"),
  remainingTermMonths: z
    .number()
    .min(12)
    .max(480)
    .optional()
    .describe("Remaining mortgage amortization term in months (defaults to 240 months / 20 years)"),
};

export function registerMortgageIsaTool(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  server.registerTool(
    "compare_mortgage_overpay_vs_isa",
    {
      description:
        "Compares overpaying an active UK mortgage (interest saved and unlocking next 85%/80%/75%/60% LTV tiers) against compounding surplus cash inside a tax-free Stocks & Shares or Cash ISA.",
      inputSchema: mortgageIsaSchema,
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

      const propertyValue = args.hypotheticalPropertyValueGbp ?? b.propertyValue ?? 350000;
      const mortgageBalance = args.hypotheticalMortgageBalanceGbp ?? b.mortgageBalance ?? 220000;
      const rateApr = args.hypotheticalMortgageRateApr ?? 4.5;
      const termMonths = args.remainingTermMonths ?? 240;

      if (mortgageBalance <= 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "No active mortgage balance found, so there is no overpayment to compare.",
                  recommendation:
                    "Not applicable: with no mortgage there is nothing to compare. This is a calculation, not advice.",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const amortization = calculateMortgageAmortization({
        propertyValueGbp: propertyValue,
        currentBalanceGbp: mortgageBalance,
        interestRateApr: rateApr,
        remainingTermMonths: termMonths,
        monthlyOverpaymentGbp: args.monthlySurplusToAllocateGbp,
        mortgageFixExpiryDate: args.targetRemortgageDate,
        afterTaxIsaExpectedReturnApr: args.cashOrStocksIsaApyPct,
      });

      const vsIsa = calculateMortgageVsIsa(
        mortgageBalance,
        rateApr,
        termMonths / 12,
        args.monthlySurplusToAllocateGbp,
        args.cashOrStocksIsaApyPct,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                currentMortgage: {
                  propertyValueGbp: propertyValue,
                  balanceGbp: mortgageBalance,
                  currentLtvPct: amortization.currentLtvPct,
                  standardMonthlyPaymentGbp: amortization.monthlyPaymentGbp,
                  standardTotalInterestGbp: amortization.totalInterestStandardGbp,
                },
                overpaymentImpact: {
                  monthlyOverpaymentGbp: args.monthlySurplusToAllocateGbp,
                  guaranteedInterestSavedGbp: amortization.interestSavedGbp,
                  monthsSaved: amortization.monthsSaved,
                  yearsSaved: vsIsa.yearsShaved,
                  newPayoffDate: amortization.payoffDate,
                },
                isaAlternative: {
                  expectedApyPct: args.cashOrStocksIsaApyPct,
                  projectedIsaPotGbp: vsIsa.isaAccumulatedValue,
                  totalContributedGbp: vsIsa.totalIsaContributed,
                  pureIsaGrowthGbp: vsIsa.isaGrowth,
                  netWealthDeltaGbp: vsIsa.netWealthDelta,
                  favorsOption:
                    vsIsa.netWealthDelta > 0
                      ? "TAX_FREE_ISA_COMPOUNDING"
                      : "GUARANTEED_MORTGAGE_OVERPAYMENT",
                },
                ltvMilestonesBeforeFixExpiry: amortization.targetLtvMilestones,
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
