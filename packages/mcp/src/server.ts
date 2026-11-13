import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VerifiedToken } from "./auth/token-verifier.js";
import { registerUkAdvisorPrompts } from "./prompts/uk-advisor.prompts.js";
import { registerAccountsResources } from "./resources/accounts.resource.js";
import { registerBaselineResources } from "./resources/baseline.resource.js";
import { registerBudgetResources } from "./resources/budget.resource.js";
import { registerTaxLedgerResources } from "./resources/tax-ledger.resource.js";
import { registerDebtSimulatorTool } from "./tools/debt-simulator.tool.js";
import { registerFinancialAuditTools } from "./tools/financial-audit.tool.js";
import { registerLifeEventsTool } from "./tools/life-events.tool.js";
import { registerMortgageIsaTool } from "./tools/mortgage-isa.tool.js";
import { registerSection24Tool } from "./tools/section24.tool.js";
import { registerUkTaxTrapTool } from "./tools/uk-tax-trap.tool.js";
import type { McpServerContext, McpUserDataProvider } from "./types.js";

const { version: SERVER_VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

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
  };

  const getContext = async () => context;

  // 1. Register Resources
  registerBaselineResources(server, getContext);
  registerAccountsResources(server, getContext);
  registerBudgetResources(server, getContext);
  registerTaxLedgerResources(server, getContext);

  // 2. Register Tools
  registerDebtSimulatorTool(server, getContext);
  registerUkTaxTrapTool(server, getContext);
  registerMortgageIsaTool(server, getContext);
  registerSection24Tool(server, getContext);
  registerLifeEventsTool(server, getContext);
  registerFinancialAuditTools(server, getContext);

  // 3. Register Prompts
  registerUkAdvisorPrompts(server, getContext);

  return server;
}
