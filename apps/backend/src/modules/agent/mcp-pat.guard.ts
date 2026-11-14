import type { VerifiedToken } from "@flump/mcp";
import { type CanActivate, type ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { McpService } from "./mcp.service";

/** A request that passed McpPatGuard: `mcpToken` is the verified personal access token. */
export type PatAuthenticatedRequest = Request & { mcpToken: VerifiedToken };

/**
 * Personal access token authentication for a REST route, through the same steps as the `/mcp`
 * transport (HttpMcpHandler.authenticateExpress): the kill switch and Origin rule, the
 * failed-attempt limiter per IP, the token (unknown, revoked, expired, or an owner the allowlist
 * leaves out, are all 401), the per-token rate limit and the usage write. A WorkOS session token
 * is not a PAT, so it is refused here just as a PAT is refused by AuthGuard.
 */
@Injectable()
export class McpPatGuard implements CanActivate {
  constructor(private readonly mcpService: McpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { mcpToken?: VerifiedToken }>();
    const outcome = await this.mcpService.getHttpHandler().authenticateExpress(req);
    if (!outcome.ok) {
      const res = http.getResponse<Response>();
      for (const [name, value] of Object.entries(outcome.headers ?? {})) res.setHeader(name, value);
      // The filter turns `error` into the response `code`. 400, 401 and 429 use the API's own
      // codes for those statuses; the kill switch and Origin refusals keep their named codes.
      const { error, message } = outcome.body as { error?: string; message?: string };
      const named = [400, 401, 429].includes(outcome.status) ? {} : { error };
      throw new HttpException({ statusCode: outcome.status, message, ...named }, outcome.status);
    }
    req.mcpToken = outcome.token;
    return true;
  }
}
