import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withPrimitiveAudit } from "./audit.js";
import { hasScopes, withScopeEnforcement } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";
import type { DefinedFlumpTool } from "./define-tool.js";
import type { McpLogger } from "./logger.js";
import { registerImportPrompts } from "./prompts/import-prompts.js";
import { registerSchemaResource } from "./resources/schema.resource.js";
import { READ_TOOLS } from "./tools/read/index.js";
import { SIMULATE_TOOLS } from "./tools/simulate/index.js";
import { WRITE_TOOLS } from "./tools/write/index.js";
import type {
  McpAuditEvent,
  McpImportProvider,
  McpServerContext,
  McpUserDataProvider,
} from "./types.js";

const { version: SERVER_VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

/**
 * Tools built with `defineFlumpTool` (envelope, error contract, own scope check). Registered in
 * array order on the raw server, so `tools/list` order is deterministic.
 */
export const FLUMP_TOOLS: readonly DefinedFlumpTool[] = [
  ...READ_TOOLS,
  ...SIMULATE_TOOLS,
  ...WRITE_TOOLS,
];

export interface CreateMcpServerOptions {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
  /** Staging access (re-plan PR D). Without it the staging tools refuse. */
  imports?: McpImportProvider;
  /**
   * Audit sink, called once per tool call, prompt get and resource read (E17-N17, H12), including
   * calls the SDK rejects for schema-invalid input. Failures are swallowed.
   */
  audit?: (event: McpAuditEvent) => void | Promise<void>;
  /** Keyed fingerprint of a call's arguments for the audit row; null when no key is set. */
  fingerprintArgs?: (args: unknown) => string | null;
  /** Where tool failures are logged (L6). Default: stderr, never stdout. */
  logger?: McpLogger;
}

/** Creates a Flump McpServer with its one resource, its tools and the two import prompts. */
export function createFlumpMcpServer(options: CreateMcpServerOptions): McpServer {
  const server = new McpServer({
    name: "flump-finance-mcp",
    version: SERVER_VERSION,
  });

  const context: McpServerContext = {
    token: options.token,
    dataProvider: options.dataProvider,
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.audit ? { audit: options.audit } : {}),
    ...(options.fingerprintArgs ? { fingerprintArgs: options.fingerprintArgs } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    authorize: (requirement) => hasScopes(options.token.scopes, requirement),
  };

  const getContext = async () => context;
  // E20-N17: handlers registered through `scoped` check token scopes at call time. H12: the audit
  // wrapper sits inside the facade, so it runs around the scope check and records refusals too.
  const scoped = withScopeEnforcement(withPrimitiveAudit(server, context), options.token.scopes);

  // Resource: the data dictionary, behind the scope facade.
  registerSchemaResource(scoped);
  // Prompts (re-plan PR D), behind the scope facade like the resource.
  registerImportPrompts(scoped);

  // Defined tools do their own scope check, so they take the raw server, not `scoped`.
  for (const tool of FLUMP_TOOLS) tool.register(server, getContext);

  return server;
}
