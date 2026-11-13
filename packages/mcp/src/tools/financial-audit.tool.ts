import {
  calculateFinancialHealthScore,
  calculateSafeToSpend,
  evaluateFinancialStage,
  evaluateUkStudentLoan,
  filterConsumerDebts,
  scrubInstitutionNames,
  type UkStudentLoanPlan,
} from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerContext } from "../types.js";

export function registerFinancialAuditTools(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // 1. evaluate_cashflow_runway_and_health
  server.registerTool(
    "evaluate_cashflow_runway_and_health",
    {
      title: "Cashflow runway and financial health",
      description:
        "Evaluates the user's stage-weighted Financial Health Score (0-100), Adaptive Lifecycle Stage (STAGE_1_DEBT_RECOVERY, STAGE_2_BUFFER_BUILD, STAGE_3_WEALTH_OPTIMIZE), weekly Safe-to-Spend, and emergency runway months with optional what-if changes to expenses or liquid reserves.",
      inputSchema: {
        hypotheticalMonthlyIncomeGbp: z
          .number()
          .min(0)
          .optional()
          .describe("Monthly net take-home pay in GBP (defaults to current budget/baseline)"),
        hypotheticalMonthlyEssentialExpensesGbp: z
          .number()
          .min(0)
          .optional()
          .describe("Monthly essential bills in GBP (housing, council tax, groceries, utilities)"),
        hypotheticalLiquidEmergencyFundGbp: z
          .number()
          .min(0)
          .optional()
          .describe("Liquid cash emergency buffer in GBP"),
      },
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
      const budget = rawData.budgetEntries ?? [];

      const essentialBills =
        args.hypotheticalMonthlyEssentialExpensesGbp ??
        (budget.filter((e) => !e.isIncome && e.isEssential).reduce((sum, e) => sum + e.amount, 0) ||
          (b.monthlyHousingCost ?? 900) + (b.monthlyOtherOutgoings ?? 1100));

      const netIncome =
        args.hypotheticalMonthlyIncomeGbp ??
        (b.monthlyTakeHomeOverride || (b.annualGrossSalary / 12) * 0.72);

      const liquidSavings = args.hypotheticalLiquidEmergencyFundGbp ?? b.totalCashSavings ?? 5000;

      const debts = (rawData.accounts ?? [])
        .filter((a) => {
          const t = (a.type || "").toLowerCase();
          return t.includes("credit") || t.includes("loan") || t.includes("overdraft");
        })
        .map((a, i) => {
          const nom = Math.abs(Number(a.balance) || 0);
          return {
            id: a.id || `debt_${i}`,
            name: a.name || `Debt #${i + 1}`,
            balanceGbp: nom,
            interestRateApr: Number(a.interestRate) || 19.9,
            minimumPaymentGbp: Math.max(25, Math.round(nom * 0.025)),
          };
        });

      const { consumerDebts } = filterConsumerDebts(debts);
      const minDebt = consumerDebts.reduce((sum, d) => sum + d.minimumPaymentGbp, 0);
      const monthlySurplus = netIncome - essentialBills - minDebt;

      const stage = evaluateFinancialStage({
        debts: consumerDebts,
        monthlySurplus,
        liquidSavings,
        monthlyEssentialExpenses: essentialBills,
      });

      const healthScore = calculateFinancialHealthScore({
        stage: stage.canonicalStage,
        totalUnsecuredDebtGbp: stage.totalUnsecuredDebt,
        highInterestDebtGbp: stage.highInterestDebt,
        monthlyNetIncomeGbp: netIncome,
        monthlyEssentialBillsGbp: essentialBills,
        emergencyFundGbp: liquidSavings,
        adjustedNetIncomeGbp: b.annualGrossSalary,
      });

      const safeToSpend = calculateSafeToSpend(netIncome, essentialBills, minDebt, 0);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              healthScore: {
                score: healthScore.overallScore,
                grade: healthScore.grade,
                components: healthScore.components,
                recommendations: healthScore.topRecommendations,
              },
              financialStage: {
                stage: stage.stage,
                canonicalStage: stage.canonicalStage,
                headline: stage.headline,
                subline: stage.subline,
                primaryHeroMetric: stage.primaryHeroMetric,
                starterBufferMet: stage.starterBufferMet,
                emergencyRunwayMonths: stage.emergencyRunwayMonths,
              },
              cashFlow: {
                monthlyNetIncomeGbp: Math.round(netIncome),
                monthlyEssentialBillsGbp: Math.round(essentialBills),
                monthlyDebtMinimumsGbp: Math.round(minDebt),
                monthlySurplusGbp: Math.round(monthlySurplus),
                safeToSpend,
              },
            }),
          },
        ],
      };
    },
  );

  // 2. evaluate_uk_student_loan
  server.registerTool(
    "evaluate_uk_student_loan",
    {
      title: "UK student loan evaluation",
      description:
        "Evaluates whether a UK student loan (Plan 1, Plan 2, Plan 4 Scotland, Plan 5, or Postgraduate) should be voluntarily overpaid vs allowing statutory write-off after 25-40 years.",
      inputSchema: {
        plan: z
          .enum(["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"])
          .default("PLAN_2")
          .describe("UK student loan repayment plan"),
        currentBalanceGbp: z.number().min(0).describe("Current outstanding loan balance in GBP"),
        annualSalaryGbp: z
          .number()
          .min(0)
          .optional()
          .describe("Annual gross salary in GBP (defaults to user baseline)"),
      },
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
      const salary = args.annualSalaryGbp ?? rawData.baseline.annualGrossSalary;

      const evalResult = evaluateUkStudentLoan(args.plan, salary, args.currentBalanceGbp);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(evalResult),
          },
        ],
      };
    },
  );

  // 3. query_transactions_and_spending
  server.registerTool(
    "query_transactions_and_spending",
    {
      title: "Transactions and spending query",
      description:
        "Queries recent bank transactions with category rollups, spending velocity, and merchant data (PII-scrubbed based on token privacy scope).",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Filter by transaction category (e.g. 'groceries', 'eating_out', 'transport', 'bills')",
          ),
        accountId: z.string().optional().describe("Filter by specific account ID"),
        startDate: z
          .string()
          .optional()
          .describe("Filter transactions on or after this ISO date 'YYYY-MM-DD'"),
        endDate: z
          .string()
          .optional()
          .describe("Filter transactions on or before this ISO date 'YYYY-MM-DD'"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(30)
          .describe("Maximum number of transaction records to return (defaults to 30)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const ctx = await getContext();
      if (!ctx.dataProvider.queryTransactions) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Transaction querying is not available for this connection mode.",
                transactions: [],
              }),
            },
          ],
        };
      }

      const txs = await ctx.dataProvider.queryTransactions(ctx.token.userId, {
        accountId: args.accountId,
        category: args.category,
        startDate: args.startDate,
        endDate: args.endDate,
        limit: args.limit,
      });

      // Anonymize descriptions if requested
      const sanitizedTxs = txs.map((tx) => {
        let desc = tx.description;
        if (ctx.token.anonymizeInstitutions) {
          desc = scrubInstitutionNames(desc);
        }
        return {
          ...tx,
          description: desc,
        };
      });

      // Category spending velocity rollup
      const categoryTotals: Record<string, { totalSpendGbp: number; transactionCount: number }> =
        {};

      for (const tx of sanitizedTxs) {
        const cat = tx.category || "uncategorized";
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { totalSpendGbp: 0, transactionCount: 0 };
        }
        categoryTotals[cat].transactionCount++;
        // Debits are negative or positive depending on feed; capture outgoings
        categoryTotals[cat].totalSpendGbp += Math.abs(tx.amount);
      }

      for (const cat in categoryTotals) {
        categoryTotals[cat]!.totalSpendGbp =
          Math.round(categoryTotals[cat]!.totalSpendGbp * 100) / 100;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              returnedCount: sanitizedTxs.length,
              categoryVelocitySummary: categoryTotals,
              transactions: sanitizedTxs,
            }),
          },
        ],
      };
    },
  );
}
