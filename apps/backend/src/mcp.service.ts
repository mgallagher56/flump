import { buildFlumpAiContextPack, formatAiContextPackMarkdown } from "@flump/finance-engine";
import { HttpMcpHandler } from "@flump/mcp";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentDataService } from "./agent/agent-data.service";
import { McpTokenService } from "./agent/mcp-token.service";
import { AUTH_MODE } from "./auth/auth.module";
import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import {
  isProductionLike,
  mcpAllowedOriginsBootWarning,
  mcpOpenAccessBootWarning,
  readMcpAccessConfig,
} from "./mcp-access";

/** Handler wiring and the offline context pack. Tokens and data live in their own services. */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private httpHandler: HttpMcpHandler;

  constructor(
    private readonly tokenService: McpTokenService,
    private readonly agentData: AgentDataService,
    private readonly configService: ConfigService,
    @Inject(AUTH_MODE) authMode: "workos" | "dev",
  ) {
    const warning = mcpOpenAccessBootWarning(process.env);
    if (warning) this.logger.warn(warning);
    const originWarning = mcpAllowedOriginsBootWarning(process.env);
    if (originWarning) this.logger.warn(originWarning);
    this.httpHandler = new HttpMcpHandler({
      dataProvider: this.agentData,
      // E20-N18: the kill switch is read per request; origins are read once at boot.
      isEnabled: () => readMcpAccessConfig(process.env).enabled,
      allowedOrigins: readMcpAccessConfig(process.env).allowedOrigins,
      tokenStore: this.tokenService,
      // Defence in depth: the dev bypass token is never emitted in a production-like process,
      // even if authMode were somehow "dev" (resolveAuthMode already refuses that at boot).
      ...(authMode === "dev" && !isProductionLike(process.env)
        ? { devToken: DEV_BYPASS_TOKEN, devUserId: DEV_USER.id }
        : {}),
      expectedAudience: this.configService.get<string>("MCP_AUDIENCE") || "flump-mcp",
      authServerUrl: this.configService.get<string>("AUTH_SERVER_URL") || "https://api.workos.com",
    });
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
