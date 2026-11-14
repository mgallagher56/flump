import { buildFlumpAiContextPack, formatAiContextPackMarkdown } from "@flump/finance-engine";
import { HttpMcpHandler, type McpAuditCaller, type McpAuditEvent } from "@flump/mcp";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentAuditService } from "./agent/agent-audit.service";
import { AgentDataService } from "./agent/agent-data.service";
import { McpImportsAdapter } from "./agent/mcp-imports.adapter";
import { McpTokenService } from "./agent/mcp-token.service";
import { AUTH_MODE } from "./auth/auth.module";
import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import { webOriginBootWarning } from "./imports/review-url";
import {
  isProductionLike,
  mcpAllowedOriginsBootWarning,
  mcpOpenAccessBootWarning,
  readMcpAccessConfig,
} from "./mcp-access";
import type { SharedRateLimitStore } from "./security/rate-limit.store";
import { SHARED_RATE_LIMIT_STORE } from "./security/shared-rate-limit";

/** Handler wiring and the offline context pack. Tokens and data live in their own services. */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  /** L6: the MCP package (handler, limiters, tools) logs through Nest, not `console`. */
  private readonly mcpLogger = new Logger("FlumpMcp");
  private httpHandler: HttpMcpHandler;

  constructor(
    private readonly tokenService: McpTokenService,
    private readonly agentData: AgentDataService,
    private readonly configService: ConfigService,
    @Inject(AUTH_MODE) authMode: "workos" | "dev",
    private readonly audit: AgentAuditService,
    private readonly importsAdapter: McpImportsAdapter,
    // BE-07 (M10): the shared Postgres counters, so the MCP limits hold across replicas and
    // restarts. Optional only for unit tests that build the service by hand (in-memory default).
    @Optional()
    @Inject(SHARED_RATE_LIMIT_STORE)
    private readonly limitStore?: SharedRateLimitStore,
  ) {
    const warning = mcpOpenAccessBootWarning(process.env);
    if (warning) this.logger.warn(warning);
    const originWarning = mcpAllowedOriginsBootWarning(process.env);
    if (originWarning) this.logger.warn(originWarning);
    const webOriginWarning = webOriginBootWarning(process.env);
    if (webOriginWarning) this.logger.warn(webOriginWarning);
    if (!process.env.MCP_AUDIT_HMAC_KEY) {
      this.logger.warn(
        "MCP_AUDIT_HMAC_KEY is not set: MCP audit rows will have no argument fingerprint.",
      );
    }
    this.httpHandler = new HttpMcpHandler({
      dataProvider: this.agentData,
      // E17 re-plan PR D: staging (write:stage enforced again in the adapter) and the audit trail.
      // Both run in this process, so no client can skip the audit.
      imports: this.importsAdapter,
      audit: (caller, event) => this.recordAudit(caller, event),
      fingerprintArgs: (args) => this.audit.fingerprint(args),
      // E20-N18: the kill switch is read per request; origins are read once at boot.
      isEnabled: () => readMcpAccessConfig(process.env).enabled,
      allowedOrigins: readMcpAccessConfig(process.env).allowedOrigins,
      ...(this.limitStore ? { limitStore: this.limitStore } : {}),
      tokenStore: this.tokenService,
      // Defence in depth: the dev bypass token is never emitted in a production-like process,
      // even if authMode were somehow "dev" (resolveAuthMode already refuses that at boot).
      ...(authMode === "dev" && !isProductionLike(process.env)
        ? { devToken: DEV_BYPASS_TOKEN, devUserId: DEV_USER.id }
        : {}),
      expectedAudience: this.configService.get<string>("MCP_AUDIENCE") || "flump-mcp",
      authServerUrl: this.configService.get<string>("AUTH_SERVER_URL") || "https://api.workos.com",
      logger: this.mcpLogger,
    });
  }

  /**
   * One audit row per tool call, prompt get and resource read (prompts and resources are named
   * `prompt_get_*` and `resource_read_*`). A failed write is logged and never fails the call.
   */
  async recordAudit(caller: McpAuditCaller, event: McpAuditEvent): Promise<void> {
    try {
      await this.audit.record({
        userId: caller.token.userId,
        tokenId: caller.token.tokenId ?? null,
        clientName: caller.clientName ?? null,
        toolName: event.tool,
        scopesUsed: event.scopesUsed,
        outcome: event.outcome,
        errorCode: event.errorCode ?? null,
        latencyMs: event.durationMs,
        responseBytes: event.responseBytes,
        argsFingerprint: event.argsFingerprint ?? null,
      });
    } catch (err) {
      this.logger.error(`mcp_audit_write_failed: ${err instanceof Error ? err.name : "error"}`);
    }
  }

  getHttpHandler(): HttpMcpHandler {
    return this.httpHandler;
  }

  // --- Context Pack for Offline Exporter ---

  async getContextPack(userId: string, anonymizeInstitutions = true) {
    const rawData = await this.agentData.getUserFinancialData(userId, { anonymizeInstitutions });
    const pack = buildFlumpAiContextPack(rawData, { anonymizeInstitutions });
    const markdown = formatAiContextPackMarkdown(pack);
    return {
      pack,
      markdown,
    };
  }
}
