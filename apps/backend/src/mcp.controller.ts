import { McpTokenActivityQuery } from "@flump/api-contract";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AgentAuditService, decodeActivityCursor } from "./agent/agent-audit.service";
import { McpTokenService } from "./agent/mcp-token.service";
import { AuthGuard } from "./auth/auth.guard";
import { McpService } from "./mcp.service";
import { McpAllowlistGuard, McpKillSwitchGuard } from "./mcp-access";
import { RateLimit } from "./security/rate-limit.decorator";

@Controller()
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly tokenService: McpTokenService,
    private readonly audit: AgentAuditService,
  ) {}

  // .well-known/oauth-protected-resource route removed while OAuth is off; re-enable with OAuth ticket.

  /**
   * Remote MCP Streamable HTTP / SSE Endpoint (JSON-RPC)
   * Dispatches directly to the official MCP SDK StreamableHTTPServerTransport.
   */
  @Post("mcp")
  @UseGuards(McpKillSwitchGuard)
  async handleMcpPost(@Req() req: any, @Res() res: any) {
    return this.mcpService.getHttpHandler().handleExpressRequest(req, res);
  }

  @Get("mcp")
  @UseGuards(McpKillSwitchGuard)
  async handleMcpGet(@Req() req: any, @Res() res: any) {
    return this.mcpService.getHttpHandler().handleExpressRequest(req, res);
  }

  /**
   * List active/revoked AI Connection tokens and audit logs
   */
  @Get("mcp-tokens")
  @UseGuards(AuthGuard)
  async listTokens(@Req() req: any) {
    const userId = req.user.id;
    return this.tokenService.listTokens(userId);
  }

  /**
   * Generate a new Personal Access Token (PAT)
   */
  @Post("mcp-tokens")
  @RateLimit("tokenMint")
  @UseGuards(McpKillSwitchGuard, AuthGuard, McpAllowlistGuard)
  async createToken(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      expiryDays?: number | null;
      anonymizeInstitutions?: boolean;
      /** Opt in to `write:stage` (E17 re-plan PR D). Default false. */
      allowStaging?: boolean;
    },
  ) {
    const userId = req.user.id;
    return this.tokenService.createPatToken(userId, body.name, {
      expiryDays: body.expiryDays,
      anonymizeInstitutions: body.anonymizeInstitutions,
      allowStaging: body.allowStaging,
    });
  }

  /**
   * A token's audited tool calls, newest first (E17-N17, re-plan PR D). Owner only, session auth;
   * another user's token is the same 404 as a missing one. Not gated by the kill switch or the
   * allowlist, like listing and revoking, so a user can always see what a token did.
   */
  @Get("mcp-tokens/:id/activity")
  @UseGuards(AuthGuard)
  async getActivity(
    @Req() req: any,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: Record<string, unknown>,
  ) {
    const userId = req.user.id;
    const parsed = McpTokenActivityQuery.safeParse(query ?? {});
    if (
      !parsed.success ||
      (parsed.data.before !== undefined && !decodeActivityCursor(parsed.data.before))
    ) {
      throw new BadRequestException("limit must be 1 to 100 and before a cursor from nextBefore.");
    }
    if (!(await this.tokenService.ownsToken(userId, id))) {
      throw new NotFoundException("AI Connection token not found.");
    }
    return this.audit.listForToken(userId, id, {
      limit: parsed.data.limit,
      ...(parsed.data.before ? { before: parsed.data.before } : {}),
    });
  }

  /**
   * Revoke an active AI Connection token
   */
  @Delete("mcp-tokens/:id")
  @RateLimit("destructive")
  @UseGuards(AuthGuard)
  async revokeToken(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const userId = req.user.id;
    return this.tokenService.revokeToken(userId, id);
  }

  /**
   * Offline AI Context Pack Exporter (.json and .md)
   */
  @Get("mcp-tokens/context-pack")
  @UseGuards(McpKillSwitchGuard, AuthGuard, McpAllowlistGuard)
  async getContextPack(@Req() req: any, @Query("anonymize") anonymize?: string) {
    const userId = req.user.id;
    const shouldAnonymize = anonymize !== "false";
    return this.mcpService.getContextPack(userId, shouldAnonymize);
  }
}
