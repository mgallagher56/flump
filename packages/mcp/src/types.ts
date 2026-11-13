import type { BuildContextPackInput, FlumpAiContextPack } from "@flump/finance-engine";
import type { ScopeRequirement } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";

export interface McpUserDataProvider {
  getUserFinancialData(
    userId: string,
    options?: { anonymizeInstitutions?: boolean },
  ): Promise<BuildContextPackInput>;
}

/** One tool call, for audit. Never carries arguments or results (E17-N8). */
export interface McpAuditEvent {
  tool: string;
  outcome: "ok" | "error";
  errorCode?: string;
  durationMs: number;
}

export interface McpServerContext {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
  contextPack?: FlumpAiContextPack;
  /** Scope hook used by `defineFlumpTool`. Falls back to the token's scopes when absent. */
  authorize?: (requirement: ScopeRequirement) => boolean;
  /** Optional audit sink; failures are swallowed. */
  audit?: (event: McpAuditEvent) => void | Promise<void>;
}
