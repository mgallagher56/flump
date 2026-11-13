import { buildFlumpAiContextPack, type FlumpAiContextPack } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { summariseComparison } from "../tools/payoff-summary.js";
import type { McpServerContext } from "../types.js";

export function registerBaselineResources(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // 1. flump://context/executive-snapshot
  server.registerResource(
    "executive-snapshot",
    "flump://context/executive-snapshot",
    { title: "Executive financial snapshot", mimeType: "application/json" },
    async (uri) => {
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

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              ...pack,
              debtSummary: {
                ...pack.debtSummary,
                avalancheVsSnowballComparison: summariseComparison(
                  pack.debtSummary.avalancheVsSnowballComparison,
                ),
              },
            }),
          },
        ],
      };
    },
  );

  // 2. flump://context/baseline
  server.registerResource(
    "baseline",
    "flump://context/baseline",
    { title: "Financial baseline", mimeType: "application/json" },
    async (uri) => {
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
        baseline: pack.baseline,
        stageEvaluation: pack.stageEvaluation,
        healthScore: pack.healthScore,
        allowances: pack.taxSummary.ukTaxCalculation.allowances,
        taxTrap: pack.taxSummary.ukTaxCalculation.taxTrap,
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );
}
