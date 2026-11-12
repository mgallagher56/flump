#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { BuildContextPackInput } from "@flump/finance-engine";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpUserDataProvider } from "../types.js";

export const PAT_REJECTED_MESSAGE = "PAT rejected: create one in Flump, AI connections";

export class PatRejectedError extends Error {
  constructor(message = PAT_REJECTED_MESSAGE) {
    super(message);
    this.name = "PatRejectedError";
  }
}

type ContextPackResponse = {
  baseline?: BuildContextPackInput["baseline"];
  portfolio?: { accounts?: BuildContextPackInput["accounts"] };
  budgetSummary?: { entries?: BuildContextPackInput["budgetEntries"] };
  taxRecords?: BuildContextPackInput["taxRecords"];
};

type Connect = (server: ReturnType<typeof createFlumpMcpServer>) => Promise<void>;

const connectStdio: Connect = async (server) => {
  await server.connect(new StdioServerTransport());
};

/**
 * Runs the stdio MCP server. No fake data: a missing PAT, an unreachable API or any
 * non-2xx response throws and nothing is connected.
 */
export async function runStdio(
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
  connect: Connect = connectStdio,
): Promise<void> {
  const pat = env.FLUMP_PAT;
  if (!pat) throw new PatRejectedError();
  const apiUrl = env.FLUMP_API_URL || "http://localhost:4000";

  const fetchPack = async (): Promise<ContextPackResponse> => {
    let res: Response;
    try {
      res = await fetchImpl(`${apiUrl}/mcp-tokens/context-pack`, {
        headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
      });
    } catch (err) {
      throw new Error(`Could not reach Flump API at ${apiUrl}: ${String(err)}`);
    }
    if (!res.ok) throw new PatRejectedError();
    return (await res.json()) as ContextPackResponse;
  };

  // Fail fast, before the transport opens, if the PAT does not work.
  const initial = await fetchPack();
  const userId = initial.baseline?.userId;
  if (!userId) throw new PatRejectedError();

  const dataProvider: McpUserDataProvider = {
    async getUserFinancialData() {
      const data = await fetchPack();
      if (!data.baseline) throw new PatRejectedError();
      return {
        baseline: data.baseline,
        accounts: data.portfolio?.accounts,
        budgetEntries: data.budgetSummary?.entries,
        taxRecords: data.taxRecords,
      };
    },
    async queryTransactions() {
      return [];
    },
  };

  const server = createFlumpMcpServer({
    token: {
      userId,
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "pat",
    },
    dataProvider,
  });
  await connect(server);
}

const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
  runStdio(process.env).catch((err) => {
    console.error(err instanceof PatRejectedError ? err.message : `Flump MCP stdio failed: ${err}`);
    process.exit(1);
  });
}
