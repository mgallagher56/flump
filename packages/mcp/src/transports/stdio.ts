#!/usr/bin/env node
import { DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpUserDataProvider } from "../types.js";

async function main() {
  const pat = process.env.FLUMP_PAT || "flump_pat_local_cli";
  const apiUrl = process.env.FLUMP_API_URL || "http://localhost:4000";

  // Data provider that fetches from Flump API using the PAT, or falls back to baseline defaults
  const dataProvider: McpUserDataProvider = {
    async getUserFinancialData(userId, options) {
      if (process.env.FLUMP_PAT) {
        try {
          const res = await fetch(`${apiUrl}/mcp-tokens/context-pack`, {
            headers: {
              Authorization: `Bearer ${pat}`,
              "Content-Type": "application/json",
            },
          });
          if (res.ok) {
            const data = await res.json();
            return {
              baseline: data.baseline,
              accounts: data.portfolio?.accounts,
              budgetEntries: data.budgetSummary?.entries,
              taxRecords: data.taxRecords,
            };
          }
        } catch (err) {
          console.error(
            "Warning: Could not connect to Flump API, falling back to local session:",
            err,
          );
        }
      }

      return {
        baseline: {
          ...DEFAULT_FINANCIAL_BASELINE,
          userId,
        },
      };
    },
    async queryTransactions() {
      return [];
    },
  };

  const server = createFlumpMcpServer({
    token: {
      userId: "cli_desktop_user",
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "pat",
    },
    dataProvider,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error in Flump MCP STDIO transport:", err);
  process.exit(1);
});
