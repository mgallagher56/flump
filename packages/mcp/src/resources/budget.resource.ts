import { buildFlumpAiContextPack } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerContext } from "../types.js";

export function registerBudgetResources(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // flump://context/budget
  server.resource("budget", "flump://context/budget", async (uri) => {
    const ctx = await getContext();
    let pack = ctx.contextPack;
    if (!pack) {
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      pack = buildFlumpAiContextPack(rawData, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      ctx.contextPack = pack;
    }

    const payload = {
      monthlyIncomeGbp: pack.budgetSummary.monthlyIncome,
      essentialBillsMonthlyGbp: pack.budgetSummary.essentialBillsMonthly,
      discretionarySpendMonthlyGbp: pack.budgetSummary.discretionarySpendMonthly,
      monthlySurplusGbp: pack.budgetSummary.monthlySurplus,
      emergencyRunwayMonths: pack.budgetSummary.emergencyRunwayMonths,
      safeToSpend: pack.budgetSummary.safeToSpend,
      budgetEntries: pack.budgetSummary.entries,
    };

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  });
}
