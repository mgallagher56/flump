import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { McpRateLimiter } from "../auth/rate-limiter.js";
import {
  TokenVerifier,
  type TokenVerifierOptions,
  type VerifiedToken,
} from "../auth/token-verifier.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpUserDataProvider } from "../types.js";

export interface HttpTransportOptions extends TokenVerifierOptions {
  dataProvider: McpUserDataProvider;
  rateLimiter?: McpRateLimiter;
}

export class HttpMcpHandler {
  private readonly verifier: TokenVerifier;
  private readonly rateLimiter: McpRateLimiter;
  private readonly dataProvider: McpUserDataProvider;

  constructor(options: HttpTransportOptions) {
    this.verifier = new TokenVerifier(options);
    this.rateLimiter = options.rateLimiter ?? new McpRateLimiter(60, 300);
    this.dataProvider = options.dataProvider;
  }

  getOAuthMetadata() {
    return this.verifier.getOAuthProtectedResourceMetadata();
  }

  /**
   * Express / NestJS request handler
   */
  async handleExpressRequest(req: any, res: any, parsedBody?: any): Promise<void> {
    try {
      // 1. Verify Authentication (OAuth JWT or flump_pat_...)
      const authHeader = req.headers?.authorization;
      const verified = await this.verifier.verifyAuthorizationHeader(authHeader);

      // 2. Check rate limits
      const limitResult = this.rateLimiter.checkLimit(verified.userId);
      if (!limitResult.allowed) {
        res.status(429).json({
          error: "rate_limit_exceeded",
          message: limitResult.message,
          retryAfter: limitResult.resetSeconds,
        });
        return;
      }

      // 3. Create server and transport instance for this request
      const mcpServer = createFlumpMcpServer({
        token: verified,
        dataProvider: this.dataProvider,
      });

      const transport = new StreamableHTTPServerTransport();
      await mcpServer.connect(transport);

      await transport.handleRequest(req, res, parsedBody ?? req.body);
    } catch (err: any) {
      const statusCode = err.message?.includes("Missing or malformed")
        ? 401
        : err.message?.includes("expired") || err.message?.includes("revoked")
          ? 401
          : 400;

      res.status(statusCode).json({
        error: "mcp_auth_error",
        message: (err as Error).message,
      });
    }
  }

  /**
   * Web Standard Request / Response handler
   */
  async handleWebRequest(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get("authorization") || undefined;
      const verified = await this.verifier.verifyAuthorizationHeader(authHeader);

      const limitResult = this.rateLimiter.checkLimit(verified.userId);
      if (!limitResult.allowed) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            message: limitResult.message,
            retryAfter: limitResult.resetSeconds,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(limitResult.resetSeconds),
            },
          },
        );
      }

      const mcpServer = createFlumpMcpServer({
        token: verified,
        dataProvider: this.dataProvider,
      });

      const transport = new WebStandardStreamableHTTPServerTransport();
      await mcpServer.connect(transport);

      return await transport.handleRequest(request);
    } catch (err: any) {
      const statusCode = err.message?.includes("Missing or malformed")
        ? 401
        : err.message?.includes("expired") || err.message?.includes("revoked")
          ? 401
          : 400;

      return new Response(
        JSON.stringify({
          error: "mcp_auth_error",
          message: (err as Error).message,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}
