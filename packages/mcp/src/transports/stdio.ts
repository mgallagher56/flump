#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { BackendError, callBackend } from "@flump/api-client";
import { McpInputResponse } from "@flump/api-contract";
import type { BuildContextPackInput } from "@flump/finance-engine";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { filterKnownScopes, type McpScope, WRITE_STAGE_SCOPE } from "../auth/scopes.js";
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
 * How long one fetched input is reused. A tool call makes several provider reads, and each
 * uncached read would be a request against the token's rate limit and a row in its activity.
 */
export const INPUT_REUSE_MS = 5_000;

/** The user id the local server runs under: the API never sends the real one to a token. */
// A fixed label, not a credential.
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
const LOCAL_USER_ID = "local-user";

/**
 * The parsed `GET /v1/mcp/input` body as the engine's input. The contract schema is strict and
 * mirrors `BuildContextPackInput`, so this is an assignment, with no cast: if the two drift,
 * this function stops compiling.
 */
export function toEngineInput(input: McpInputResponse["input"]): BuildContextPackInput {
  return input;
}

/**
 * The scopes the local server runs with: the token's own, minus staging. Staging writes go
 * through the remote server only (the local one has no import access), so `write:stage` is
 * never honoured here.
 */
export function localScopes(scopes: readonly string[]): McpScope[] {
  return filterKnownScopes(scopes).filter((scope) => scope !== WRITE_STAGE_SCOPE);
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
  now: () => number = Date.now,
): Promise<void> {
  const pat = env.FLUMP_PAT;
  if (!pat) throw new PatRejectedError();
  const apiUrl = env.FLUMP_API_URL || "http://localhost:4000";

  const fetchInput = async (): Promise<McpInputResponse> => {
    try {
      // Contract-typed: `/v1/mcp/input` accepts a personal access token, and a body that does
      // not match McpInputResponse is a typed bad-response rather than undefined fields in a tool.
      const { data } = await callBackend(
        {
          baseUrl: apiUrl,
          fetch: fetchImpl,
          headers: () => ({ Authorization: `Bearer ${pat}` }),
        },
        "/mcp/input",
        { schema: McpInputResponse, timeoutMs: REQUEST_TIMEOUT_MS },
      );
      return data;
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

  // One request serves every read made within INPUT_REUSE_MS (concurrent ones share it); a
  // failed request is not kept, so the next read tries again.
  let latest: { at: number; request: Promise<McpInputResponse> } | undefined;
  const readInput = (): Promise<McpInputResponse> => {
    if (latest && now() - latest.at < INPUT_REUSE_MS) return latest.request;
    const entry = { at: now(), request: fetchInput() };
    latest = entry;
    entry.request.catch(() => {
      if (latest === entry) latest = undefined;
    });
    return entry.request;
  };

  // Fail fast, before the transport opens, if the PAT does not work.
  const initial = await readInput();

  // Tool calls read data at most INPUT_REUSE_MS old. The token's rules are fixed at start: a
  // token whose scopes change (or that is revoked) fails its next read and the tool call with it.
  const getUserFinancialData = async () => toEngineInput((await readInput()).input);
  const dataProvider: McpUserDataProvider = {
    getUserFinancialData,
    ...inMemoryQueries(getUserFinancialData),
  };

  const server = createFlumpMcpServer({
    token: {
      userId: LOCAL_USER_ID,
      // The same key as the remote server, so a short id means the same account in both.
      ...(initial.token.id ? { tokenId: initial.token.id } : {}),
      scopes: localScopes(initial.token.scopes),
      anonymizeInstitutions: initial.token.anonymizeInstitutions,
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
