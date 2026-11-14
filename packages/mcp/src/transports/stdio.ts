#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { BackendError, callBackend } from "@flump/api-client";
import { ContextPackResponse } from "@flump/api-contract";
import type { BuildContextPackInput, FinancialBaseline } from "@flump/finance-engine";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type McpLogger, stderrLogger } from "../logger.js";
import { inMemoryQueries } from "../provider/in-memory.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpUserDataProvider } from "../types.js";

export const PAT_REJECTED_MESSAGE =
  "Personal access token rejected. Create a new one in Flump under AI connections.";

export class PatRejectedError extends Error {
  constructor(message = PAT_REJECTED_MESSAGE) {
    super(message);
    this.name = "PatRejectedError";
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Feeds the in-memory provider from a parsed context pack. The pack is the engine's output, not
 * its raw input: its baseline is an open record with the stage removed, and it carries no tax
 * records. The baseline conversion below is a domain mapping of an already-validated body, not a
 * response cast; a raw-input endpoint for PAT holders is a follow-up (see BE-10 PR).
 */
export function packToInput(pack: ContextPackResponse["pack"]): BuildContextPackInput {
  return {
    baseline: pack.baseline as unknown as FinancialBaseline,
    accounts: pack.portfolio.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.rawType,
      balance: a.nominalBalance,
      interestRate: a.interestRateKnown ? a.interestRate : null,
      monthlyContribution: a.monthlyContributionKnown ? a.monthlyContribution : null,
      currency: a.currency,
    })),
    budgetEntries: pack.budgetSummary.entries,
    taxRecords: [],
    // The figures in the pack were computed under these choices.
    netWorthBasis: { ...pack.portfolio.netWorthBasis },
  };
}

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
  // stdout carries the protocol here, so logs go to stderr only.
  logger: McpLogger = stderrLogger,
): Promise<void> {
  const pat = env.FLUMP_PAT;
  if (!pat) throw new PatRejectedError();
  const apiUrl = env.FLUMP_API_URL || "http://localhost:4000";

  const fetchPack = async (): Promise<ContextPackResponse["pack"]> => {
    try {
      // Contract-typed (BE-10): `/v1`, and a body that does not match ContextPackResponse is a
      // typed bad-response rather than undefined fields deep in a tool.
      const { data } = await callBackend(
        {
          baseUrl: apiUrl,
          fetch: fetchImpl,
          headers: () => ({ Authorization: `Bearer ${pat}` }),
        },
        "/mcp-tokens/context-pack",
        { schema: ContextPackResponse, timeoutMs: REQUEST_TIMEOUT_MS },
      );
      return data.pack;
    } catch (err) {
      if (!(err instanceof BackendError)) throw err;
      if (err.kind === "unavailable") {
        throw new Error(
          `Could not reach Flump API at ${apiUrl} (${err.cause instanceof Error ? err.cause.name : "error"})`,
        );
      }
      if (err.kind === "bad-response") {
        throw new Error(
          `Flump API at ${apiUrl} returned a response that does not match the contract${err.requestId ? ` (request ${err.requestId})` : ""}`,
        );
      }
      throw new PatRejectedError();
    }
  };

  // Fail fast, before the transport opens, if the PAT does not work.
  const initial = await fetchPack();
  const userId = initial.baseline.userId;
  if (typeof userId !== "string" || userId === "") throw new PatRejectedError();

  const getUserFinancialData = async () => {
    return packToInput(await fetchPack());
  };
  // The context pack has no monthly rows, so history reads return empty with missing[] here.
  const dataProvider: McpUserDataProvider = {
    getUserFinancialData,
    ...inMemoryQueries(getUserFinancialData),
  };

  const server = createFlumpMcpServer({
    token: {
      userId,
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "pat",
    },
    dataProvider,
    logger,
  });
  await connect(server);
}

const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
  runStdio(process.env).catch((err) => {
    stderrLogger.error(
      err instanceof PatRejectedError ? err.message : `Flump MCP stdio failed: ${err}`,
    );
    process.exit(1);
  });
}
