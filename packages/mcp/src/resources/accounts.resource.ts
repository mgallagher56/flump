import { buildFlumpAiContextPack } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerContext } from "../types.js";

export function registerAccountsResources(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // flump://context/accounts
  server.resource("accounts", "flump://context/accounts", async (uri) => {
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
      netWorthGbp: pack.portfolio.netWorth,
      totalAssetsGbp: pack.portfolio.totalAssets,
      totalLiabilitiesGbp: pack.portfolio.totalLiabilities,
      liquidCashGbp: pack.portfolio.totalLiquidCash,
      investmentsGbp: pack.portfolio.totalInvestments,
      pensionsGbp: pack.portfolio.totalPensions,
      consumerDebtGbp: pack.portfolio.totalConsumerDebt,
      mortgageBalanceGbp: pack.portfolio.totalMortgageBalance,
      weightedSavingsRatePct: pack.portfolio.weightedSavingsRate,
      monthlyHistory: pack.portfolio.monthlyHistory,
      accounts: pack.portfolio.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        nominalBalanceGbp: a.nominalBalance,
        interestRateApr: a.interestRate,
        monthlyContributionGbp: a.monthlyContribution,
        isAsset: a.isAsset,
        isLiability: a.isLiability,
      })),
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
