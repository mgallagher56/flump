import {
  type CreateMcpTokenRequest,
  MAX_ACTIVITY_PAGE,
  McpTokenActivityQuery,
} from "@flump/api-contract";
import { hasScopes, RAW_INPUT_SCOPES } from "@flump/mcp";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { McpAllowlistGuard, McpKillSwitchGuard } from "../../auth/mcp-access";
import { resolvePage, sendPage } from "../../contract/pagination";
import { RateLimit } from "../../security/rate-limit.decorator";
import { AgentAuditService, decodeActivityCursor } from "./agent-audit.service";
import { McpService } from "./mcp.service";
import { McpPatGuard, type PatAuthenticatedRequest } from "./mcp-pat.guard";
import { McpTokenService } from "./mcp-token.service";

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
   * Dispatches directly to the official MCP SDK StreamableHTTPServerTransport, which writes the
   * raw response (and its own status) itself.
   */
  @Post("mcp")
  @HttpCode(200)
  @UseGuards(McpKillSwitchGuard)
  async handleMcpPost(@Req() req: Request, @Res() res: Response) {
    return this.mcpService.getHttpHandler().handleExpressRequest(req, res);
  }

  @Get("mcp")
  @HttpCode(200)
  @UseGuards(McpKillSwitchGuard)
  async handleMcpGet(@Req() req: Request, @Res() res: Response) {
    return this.mcpService.getHttpHandler().handleExpressRequest(req, res);
  }

  /**
   * The raw engine input for the owner of the personal access token, for the local (stdio) MCP
   * server. PAT only (McpPatGuard): the user is the token's owner and nothing in the request can
   * name another one. Needs a read scope. An anonymised token gets the anonymised input. Every
   * read, and every refusal for a missing scope, is one row in the token's activity.
   */
  @Get("mcp/input")
  @HttpCode(200)
  @UseGuards(McpPatGuard)
  async getInput(@Req() req: PatAuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const token = req.mcpToken;
    const userAgent = req.headers["user-agent"];
    const caller = { token, ...(typeof userAgent === "string" ? { clientName: userAgent } : {}) };
    res.setHeader("Cache-Control", "no-store");
    if (!hasScopes(token.scopes, RAW_INPUT_SCOPES)) {
      await this.mcpService.recordInputRead(caller, { outcome: "denied", startedAt: Date.now() });
      throw new ForbiddenException({
        statusCode: 403,
        error: "insufficient_scope",
        message: "This token cannot read data.",
      });
    }
    return this.mcpService.getInput(caller);
  }

  /**
   * List active/revoked AI Connection tokens and audit logs
   */
  @Get("mcp-tokens")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async listTokens(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    // Keyset-paginated (BE-09): `?limit=&cursor=`, next cursor in X-Next-Cursor.
    const page = await this.tokenService.listTokensPage(
      req.user.id,
      resolvePage(query, "mcpTokens"),
    );
    return sendPage(res, page);
  }

  /**
   * Generate a new Personal Access Token (PAT)
   */
  @Post("mcp-tokens")
  @HttpCode(201)
  @RateLimit("tokenMint")
  @UseGuards(McpKillSwitchGuard, AuthGuard, McpAllowlistGuard)
  async createToken(@Req() req: AuthenticatedRequest, @Body() body: CreateMcpTokenRequest) {
    return this.tokenService.createPatToken(req.user.id, body.name, {
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
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async getActivity(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: unknown,
  ) {
    const userId = req.user.id;
    // Parsed again so the cursor rule holds with CONTRACT_MODE=off outside production.
    const parsed = McpTokenActivityQuery.safeParse(query ?? {});
    if (
      !parsed.success ||
      (parsed.data.before !== undefined && !decodeActivityCursor(parsed.data.before))
    ) {
      throw new BadRequestException(
        `limit must be 1 to ${MAX_ACTIVITY_PAGE} and before a cursor from nextBefore.`,
      );
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
  @HttpCode(200)
  @RateLimit("destructive")
  @UseGuards(AuthGuard)
  async revokeToken(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.tokenService.revokeToken(req.user.id, id);
  }

  /**
   * Offline AI Context Pack Exporter (.json and .md)
   */
  @Get("mcp-tokens/context-pack")
  @HttpCode(200)
  @UseGuards(McpKillSwitchGuard, AuthGuard, McpAllowlistGuard)
  async getContextPack(@Req() req: AuthenticatedRequest, @Query("anonymize") anonymize?: string) {
    const shouldAnonymize = anonymize !== "false";
    return this.mcpService.getContextPack(req.user.id, shouldAnonymize);
  }
}
