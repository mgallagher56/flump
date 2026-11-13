import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

type Env = Record<string, string | undefined>;

/** Production-like: NODE_ENV=production or running on Railway (same detection as security.config.ts). */
export function isProductionLike(env: Env): boolean {
  return env.NODE_ENV === "production" || Boolean(env.RAILWAY_ENVIRONMENT);
}

/** Warning for a non-production process where MCP is open only because the flag is unset. */
export function mcpOpenAccessBootWarning(env: Env): string | null {
  const config = readMcpAccessConfig(env);
  if (config.openAccess && env.MCP_OPEN_ACCESS === undefined) {
    return "MCP is open to every user because MCP_OPEN_ACCESS is not set; set it explicitly (true or false).";
  }
  return null;
}

function parseOriginList(env: Env): string[] {
  return (env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isDroppedOrigin(o: string): boolean {
  return o === "*" || o.toLowerCase() === "null";
}

export interface McpAccessConfig {
  /** Global kill switch (E20-N18). False only when `MCP_ENABLED=false`. */
  enabled: boolean;
  /** `MCP_OPEN_ACCESS`: true opens MCP to everyone. Unset means off in production-like environments, on elsewhere. */
  openAccess: boolean;
  /** `MCP_ALLOWED_USER_IDS`: comma-separated WorkOS user ids. */
  allowedUserIds: string[];
  /**
   * `MCP_ALLOWED_ORIGINS` (E20-N18): comma-separated browser origins that may call /mcp. Default
   * empty in every environment, so any request carrying an `Origin` header is rejected with 403.
   * Requests without an Origin (Claude/ChatGPT connectors, CLIs and other non-browser clients)
   * are unaffected.
   */
  allowedOrigins: string[];
}

/**
 * MCP access (E29-T8). Creating tokens, downloading the context pack and using an existing
 * token are limited to allowlisted users until `MCP_OPEN_ACCESS=true`. Listing and revoking
 * tokens is never gated. E20-N18 reuses this reader for the kill switch.
 */
export function readMcpAccessConfig(env: Env): McpAccessConfig {
  const allowedUserIds = (env.MCP_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const enabled = env.MCP_ENABLED?.trim().toLowerCase() !== "false";
  const flag = env.MCP_OPEN_ACCESS?.trim().toLowerCase();
  const openAccess = flag === "true" ? true : flag === "false" ? false : !isProductionLike(env);
  // `*` and `null` are never wildcards or allowed origins; they are dropped (see the boot warning).
  const allowedOrigins = parseOriginList(env).filter((o) => !isDroppedOrigin(o));
  return { enabled, openAccess, allowedUserIds, allowedOrigins };
}

export function isMcpUserAllowed(config: McpAccessConfig, userId: string | undefined): boolean {
  if (config.openAccess) return true;
  return Boolean(userId && config.allowedUserIds.includes(userId));
}

/** Runs before AuthGuard: a disabled MCP answers 503 to everyone. */
@Injectable()
export class McpKillSwitchGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (readMcpAccessConfig(process.env).enabled) return true;
    throw new ServiceUnavailableException({
      statusCode: 503,
      error: "mcp_disabled",
      message: "AI connections are temporarily unavailable.",
    });
  }
}

/** Runs after AuthGuard so `request.user` is set. */
@Injectable()
export class McpAllowlistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (isMcpUserAllowed(readMcpAccessConfig(process.env), request.user?.id)) return true;
    throw new NotFoundException({
      statusCode: 404,
      error: "feature_disabled",
      message: "AI connections are not available for this account.",
    });
  }
}

/**
 * Boot-time warning for `MCP_ALLOWED_ORIGINS` entries that cannot work: `*` and `null` are
 * ignored, and anything without an http(s) scheme can never match a browser Origin.
 */
export function mcpAllowedOriginsBootWarning(env: Env): string | null {
  const bad = parseOriginList(env).filter(
    (o) => isDroppedOrigin(o) || !/^https?:\/\/[^/\s]+$/i.test(o),
  );
  if (bad.length === 0) return null;
  return `MCP_ALLOWED_ORIGINS has invalid entries (${bad.join(", ")}); "*" and "null" are ignored and entries without an http(s) scheme never match. Use exact origins such as https://app.example.com.`;
}
