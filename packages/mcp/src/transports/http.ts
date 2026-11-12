import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { FailedAuthLimiter } from "../auth/failed-auth-limiter.js";
import { McpRateLimiter } from "../auth/rate-limiter.js";
import {
  AuthenticationError,
  TokenVerifier,
  type TokenVerifierOptions,
  type VerifiedToken,
} from "../auth/token-verifier.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpUserDataProvider } from "../types.js";

export interface HttpTransportOptions extends TokenVerifierOptions {
  dataProvider: McpUserDataProvider;
  rateLimiter?: McpRateLimiter;
  /** Pre-auth limiter for failed attempts per client IP (default 10 per minute). */
  failedAuthLimiter?: FailedAuthLimiter;
}

const WWW_AUTHENTICATE = 'Bearer realm="flump-mcp"';
const GENERIC_BAD_REQUEST = { error: "bad_request", message: "Bad request" };

/** Rightmost X-Forwarded-For entry (appended by the nearest trusted proxy), else "unknown". */
/**
 * SECURITY: takes the RIGHTMOST x-forwarded-for entry, which is the one appended by the
 * trusted proxy. This is only safe behind Railway's edge (which appends the real client
 * address); if the service is reachable any other way, the client controls this header.
 */
function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const last = xff?.split(",").pop()?.trim();
  return last || "unknown";
}

export class HttpMcpHandler {
  private readonly verifier: TokenVerifier;
  private readonly rateLimiter: McpRateLimiter;
  private readonly failedAuthLimiter: FailedAuthLimiter;
  private readonly dataProvider: McpUserDataProvider;

  constructor(options: HttpTransportOptions) {
    this.verifier = new TokenVerifier(options);
    this.rateLimiter = options.rateLimiter ?? new McpRateLimiter(60, 300);
    this.failedAuthLimiter = options.failedAuthLimiter ?? new FailedAuthLimiter(10, 60_000);
    this.dataProvider = options.dataProvider;
  }

  getOAuthMetadata() {
    return this.verifier.getOAuthProtectedResourceMetadata();
  }

  /**
   * Express / NestJS request handler
   */
  async handleExpressRequest(req: any, res: any, parsedBody?: any): Promise<void> {
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const blocked = this.failedAuthLimiter.check(ip);
    if (blocked.blocked) {
      res.setHeader("Retry-After", String(blocked.retryAfterSeconds));
      res.status(429).json({
        error: "rate_limit_exceeded",
        message: "Too many failed attempts.",
        retryAfter: blocked.retryAfterSeconds,
      });
      return;
    }

    try {
      // 1. Verify Authentication (flump_pat_... personal access token)
      const authHeader = req.headers?.authorization;
      const verified = await this.verifier.verifyAuthorizationHeader(authHeader);
      this.failedAuthLimiter.recordSuccess(ip);

      // 2. Check rate limits
      const limitResult = this.rateLimiter.checkLimit(verified.userId);
      if (!limitResult.allowed) {
        res.setHeader("Retry-After", String(limitResult.resetSeconds));
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
      if (err instanceof AuthenticationError) {
        this.failedAuthLimiter.recordFailure(ip);
        res.setHeader("WWW-Authenticate", WWW_AUTHENTICATE);
        res.status(401).json({ error: "mcp_auth_error", message: err.message });
        return;
      }
      console.error("MCP request failed:", err);
      res.status(400).json(GENERIC_BAD_REQUEST);
    }
  }

  /**
   * Web Standard Request / Response handler
   */
  async handleWebRequest(request: Request): Promise<Response> {
    const ip = clientIpFromHeaders(request.headers);
    const blocked = this.failedAuthLimiter.check(ip);
    if (blocked.blocked) {
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: "Too many failed attempts.",
          retryAfter: blocked.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(blocked.retryAfterSeconds),
          },
        },
      );
    }

    try {
      const authHeader = request.headers.get("authorization") || undefined;
      const verified = await this.verifier.verifyAuthorizationHeader(authHeader);
      this.failedAuthLimiter.recordSuccess(ip);

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
      if (err instanceof AuthenticationError) {
        this.failedAuthLimiter.recordFailure(ip);
        return new Response(JSON.stringify({ error: "mcp_auth_error", message: err.message }), {
          status: 401,
          headers: { "Content-Type": "application/json", "WWW-Authenticate": WWW_AUTHENTICATE },
        });
      }
      console.error("MCP request failed:", err);
      return new Response(JSON.stringify(GENERIC_BAD_REQUEST), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
