import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { FailedAuthLimiter } from "../auth/failed-auth-limiter.js";
import type { LimitStore } from "../auth/limit-store.js";
import { McpRateLimiter } from "../auth/rate-limiter.js";
import {
  AuthenticationError,
  TokenVerifier,
  type TokenVerifierOptions,
  type VerifiedToken,
} from "../auth/token-verifier.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpAuditEvent, McpImportProvider, McpUserDataProvider } from "../types.js";

/** Who made an audited call: the verified token plus the self-reported client, if any. */
export interface McpAuditCaller {
  token: VerifiedToken;
  /** Self-reported (the User-Agent header); the sink must sanitise it. */
  clientName?: string;
}

export interface HttpTransportOptions extends TokenVerifierOptions {
  dataProvider: McpUserDataProvider;
  /** Staging access for the write tools (re-plan PR D). Without it they refuse. */
  imports?: McpImportProvider;
  /**
   * Audit sink for every tool call (E17-N17), run in this process so a client cannot skip it.
   * Failures are swallowed.
   */
  audit?: (caller: McpAuditCaller, event: McpAuditEvent) => void | Promise<void>;
  /** Keyed fingerprint of a call's arguments for the audit row; null when no key is set. */
  fingerprintArgs?: (args: unknown) => string | null;
  rateLimiter?: McpRateLimiter;
  /** Pre-auth limiter for failed attempts per client IP (default 10 per minute). */
  failedAuthLimiter?: FailedAuthLimiter;
  /**
   * Where the default limiters keep their counters (BE-07, M10). The backend passes its shared
   * Postgres store so limits hold across replicas and restarts. Default: in memory, per process.
   * Ignored for a limiter passed in explicitly.
   */
  limitStore?: LimitStore;
  /**
   * Global kill switch (E20-N18). When it returns false every request is answered 503 before
   * Origin checks, rate limiting or auth. A function so the owner can flip it without a restart.
   * Default: enabled.
   */
  isEnabled?: () => boolean;
  /**
   * Browser origins allowed to call /mcp (E20-N18, DNS-rebinding/CSRF defence). A request with an
   * `Origin` header that is not listed gets 403; no `Origin` (non-browser clients) is allowed.
   * Default: empty, so any browser origin is rejected.
   */
  allowedOrigins?: readonly string[];
}

/** Normalises an origin for comparison: trimmed, lower-cased, no trailing slash. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, "");
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const DISABLED_BODY = {
  error: "mcp_disabled",
  message: "AI connections are temporarily unavailable.",
};
const FORBIDDEN_ORIGIN_BODY = { error: "origin_not_allowed", message: "Origin not allowed." };

const WWW_AUTHENTICATE = 'Bearer realm="flump-mcp"';
const GENERIC_BAD_REQUEST = { error: "bad_request", message: "Bad request" };

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

/** Largest request body the web path buffers for usage counting. */
export const MAX_BODY_BYTES = 1_048_576;
/** Batch messages beyond this many are not counted. */
export const MAX_BATCH_COUNTED = 100;

/** Reads a stream up to `max` bytes; returns null when the limit is exceeded. */
async function readLimited(stream: ReadableStream<Uint8Array> | null, max: number) {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const limiterKey = (v: VerifiedToken) => (v.tokenId ? `tok:${v.tokenId}` : `usr:${v.userId}`);

function payloadTooLarge() {
  return new Response(
    JSON.stringify({ error: "payload_too_large", message: "Request too large." }),
    {
      status: 413,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/** Counts `tools/call` messages in a JSON-RPC body (a single message or a batch). */
export function countToolCalls(body: unknown): number {
  const messages = Array.isArray(body) ? body.slice(0, MAX_BATCH_COUNTED) : [body];
  return messages.filter(
    (m) =>
      typeof m === "object" && m !== null && (m as { method?: unknown }).method === "tools/call",
  ).length;
}

export class HttpMcpHandler {
  private readonly verifier: TokenVerifier;
  private readonly rateLimiter: McpRateLimiter;
  private readonly failedAuthLimiter: FailedAuthLimiter;
  private readonly dataProvider: McpUserDataProvider;
  private readonly options: HttpTransportOptions;
  private readonly isEnabled: () => boolean;
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(options: HttpTransportOptions) {
    this.isEnabled = options.isEnabled ?? (() => true);
    this.allowedOrigins = new Set((options.allowedOrigins ?? []).map(normalizeOrigin));
    this.verifier = new TokenVerifier(options);
    this.rateLimiter = options.rateLimiter ?? new McpRateLimiter(60, 300, options.limitStore);
    this.failedAuthLimiter =
      options.failedAuthLimiter ?? new FailedAuthLimiter(10, 60_000, options.limitStore);
    this.dataProvider = options.dataProvider;
    this.options = options;
  }

  /** One server per request, carrying this request's caller into the audit sink. */
  private serverFor(verified: VerifiedToken, userAgent: unknown) {
    const { audit, imports, fingerprintArgs } = this.options;
    const caller: McpAuditCaller = {
      token: verified,
      ...(typeof userAgent === "string" ? { clientName: userAgent } : {}),
    };
    return createFlumpMcpServer({
      token: verified,
      dataProvider: this.dataProvider,
      ...(imports ? { imports } : {}),
      ...(audit ? { audit: (event: McpAuditEvent) => audit(caller, event) } : {}),
      ...(fingerprintArgs ? { fingerprintArgs } : {}),
    });
  }

  /** Awaits the usage write; a failure is logged and never fails the request. */
  private async recordUsage(verified: VerifiedToken, body: unknown): Promise<void> {
    if (!verified.tokenId) return;
    try {
      await this.verifier.recordRequest(verified.tokenId, countToolCalls(body));
    } catch (err) {
      console.error("Failed to record MCP token usage:", err);
    }
  }

  /** 503 when the kill switch is on, 403 for a disallowed Origin, otherwise null. Runs before auth. */
  private gate(origin: unknown): { status: number; body: object } | null {
    if (!this.isEnabled()) return { status: 503, body: DISABLED_BODY };
    if (origin === null || origin === undefined) return null;
    // A non-string Origin (a repeated header arrives as an array) is never allowed.
    if (typeof origin !== "string" || !this.allowedOrigins.has(normalizeOrigin(origin))) {
      return { status: 403, body: FORBIDDEN_ORIGIN_BODY };
    }
    return null;
  }

  getOAuthMetadata() {
    return this.verifier.getOAuthProtectedResourceMetadata();
  }

  /**
   * Express / NestJS request handler
   */
  async handleExpressRequest(req: any, res: any, parsedBody?: any): Promise<void> {
    const rejected = this.gate(req.headers?.origin);
    if (rejected) {
      res.status(rejected.status).json(rejected.body);
      return;
    }
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const blocked = await this.failedAuthLimiter.check(ip);
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
      await this.failedAuthLimiter.recordSuccess(ip);

      // 2. Check rate limits, then record usage for allowed requests only
      const limitResult = await this.rateLimiter.checkLimit(limiterKey(verified));
      if (!limitResult.allowed) {
        res.setHeader("Retry-After", String(limitResult.resetSeconds));
        res.status(429).json({
          error: "rate_limit_exceeded",
          message: limitResult.message,
          retryAfter: limitResult.resetSeconds,
        });
        return;
      }

      await this.recordUsage(verified, parsedBody ?? req.body);

      // 3. Create server and transport instance for this request
      const mcpServer = this.serverFor(verified, req.headers?.["user-agent"]);

      const transport = new StreamableHTTPServerTransport();
      await mcpServer.connect(transport);

      await transport.handleRequest(req, res, parsedBody ?? req.body);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        await this.failedAuthLimiter.recordFailure(ip);
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
    const rejected = this.gate(request.headers.get("origin"));
    if (rejected) {
      return new Response(JSON.stringify(rejected.body), {
        status: rejected.status,
        headers: JSON_HEADERS,
      });
    }
    const ip = clientIpFromHeaders(request.headers);
    const blocked = await this.failedAuthLimiter.check(ip);
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
      await this.failedAuthLimiter.recordSuccess(ip);

      const limitResult = await this.rateLimiter.checkLimit(limiterKey(verified));
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

      const declared = Number(request.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return payloadTooLarge();
      let body: unknown;
      if (verified.tokenId) {
        const text = await readLimited(request.clone().body, MAX_BODY_BYTES);
        if (text === null) return payloadTooLarge();
        try {
          body = JSON.parse(text);
        } catch {
          body = undefined;
        }
      }
      await this.recordUsage(verified, body);

      const mcpServer = this.serverFor(verified, request.headers.get("user-agent"));

      const transport = new WebStandardStreamableHTTPServerTransport();
      await mcpServer.connect(transport);

      return await transport.handleRequest(request);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        await this.failedAuthLimiter.recordFailure(ip);
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
