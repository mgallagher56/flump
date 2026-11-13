import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth/auth.guard";
import { McpService } from "./mcp.service";
import { McpAllowlistGuard, McpKillSwitchGuard } from "./mcp-access";
import { RateLimit } from "./security/rate-limit.decorator";

@Controller()
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  // .well-known/oauth-protected-resource route removed while OAuth is off; re-enable with OAuth ticket.

  /**
   * Remote MCP Streamable HTTP / SSE Endpoint (JSON-RPC)
   * Dispatches directly to the official MCP SDK StreamableHTTPServerTransport.
   */
  @Post("mcp")
  async handleMcpPost(@Req() req: any, @Res() res: any) {
    return this.mcpService.getHttpHandler().handleExpressRequest(req, res);
  }

  @Get("mcp")
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
    return this.mcpService.listTokens(userId);
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
    },
  ) {
    const userId = req.user.id;
    return this.mcpService.createPatToken(userId, body.name, {
      expiryDays: body.expiryDays,
      anonymizeInstitutions: body.anonymizeInstitutions,
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
    return this.mcpService.revokeToken(userId, id);
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
