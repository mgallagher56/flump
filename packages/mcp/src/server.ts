import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hasScopes, withScopeEnforcement } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";
import type { DefinedFlumpTool } from "./define-tool.js";
import { registerUkAdvisorPrompts } from "./prompts/uk-advisor.prompts.js";
import { registerAccountsResources } from "./resources/accounts.resource.js";
import { registerBaselineResources } from "./resources/baseline.resource.js";
import { registerBudgetResources } from "./resources/budget.resource.js";
import { registerTaxLedgerResources } from "./resources/tax-ledger.resource.js";
import { READ_TOOLS } from "./tools/read/index.js";
import { registerSection24Tool } from "./tools/section24.tool.js";
import { SIMULATE_TOOLS } from "./tools/simulate/index.js";
import { registerUkTaxTrapTool } from "./tools/uk-tax-trap.tool.js";
import type { McpServerContext, McpUserDataProvider } from "./types.js";

const { version: SERVER_VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

/**
 * Tools built with `defineFlumpTool` (envelope, error contract, own scope check). Registered in
 * array order on the raw server, so `tools/list` order is deterministic. E17-N9 and N11 add here.
 */
export const FLUMP_TOOLS: readonly DefinedFlumpTool[] = [...READ_TOOLS, ...SIMULATE_TOOLS];

export interface CreateMcpServerOptions {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
}

/**
 * Creates and configures a Flump McpServer instance with all resources, tools, and prompts.
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

  // 1. Register Resources
  registerBaselineResources(scoped, getContext);
  registerAccountsResources(scoped, getContext);
  registerBudgetResources(scoped, getContext);
  registerTaxLedgerResources(scoped, getContext);

  // 2. Register Tools
  registerUkTaxTrapTool(scoped, getContext);
  registerSection24Tool(scoped, getContext);
  // Defined tools do their own scope check, so they take the raw server, not `scoped`.
  for (const tool of FLUMP_TOOLS) tool.register(server, getContext);

  // 3. Register Prompts
  registerUkAdvisorPrompts(scoped, getContext);

  return server;
}
