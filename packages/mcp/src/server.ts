import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hasScopes, withScopeEnforcement } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";
import type { DefinedFlumpTool } from "./define-tool.js";
import { registerSchemaResource } from "./resources/schema.resource.js";
import { READ_TOOLS } from "./tools/read/index.js";
import { SIMULATE_TOOLS } from "./tools/simulate/index.js";
import type { McpServerContext, McpUserDataProvider } from "./types.js";

const { version: SERVER_VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

/**
 * Tools built with `defineFlumpTool` (envelope, error contract, own scope check). Registered in
 * array order on the raw server, so `tools/list` order is deterministic.
 */
export const FLUMP_TOOLS: readonly DefinedFlumpTool[] = [...READ_TOOLS, ...SIMULATE_TOOLS];

export interface CreateMcpServerOptions {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
}

/**
 * Creates a Flump McpServer with its one resource and its tools. There are no prompts until the
 * re-plan's PR D.
 */
export function createFlumpMcpServer(options: CreateMcpServerOptions): McpServer {
  const server = new McpServer({
    name: "flump-finance-mcp",
    version: SERVER_VERSION,
  });

  const context: McpServerContext = {
    token: options.token,
    dataProvider: options.dataProvider,
    authorize: (requirement) => hasScopes(options.token.scopes, requirement),
  };

  const getContext = async () => context;
  // E20-N17: handlers registered through `scoped` check token scopes at call time.
  const scoped = withScopeEnforcement(server, options.token.scopes);

  // Resource: the data dictionary, behind the scope facade.
  registerSchemaResource(scoped);

  // Defined tools do their own scope check, so they take the raw server, not `scoped`.
  for (const tool of FLUMP_TOOLS) tool.register(server, getContext);

  return server;
}
