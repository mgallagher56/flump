import { buildFlumpAiContextPack } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerContext } from "../types.js";

export function registerTaxLedgerResources(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // flump://context/tax-ledger
  server.resource("tax-ledger", "flump://context/tax-ledger", async (uri) => {
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
      taxYear: pack.taxSummary.currentTaxYear,
      ukTaxCalculation: pack.taxSummary.ukTaxCalculation,
      selfAssessmentLedgerSummary: pack.taxSummary.selfAssessmentLedgerSummary ?? null,
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
