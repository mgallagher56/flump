import { createHash } from "node:crypto";

export type McpScope = "mcp:read:anonymized" | "mcp:read:full" | "mcp:simulate";

export interface VerifiedToken {
  userId: string;
  tokenId?: string;
  scopes: McpScope[];
  anonymizeInstitutions: boolean;
  type: "pat" | "oauth" | "dev";
}

export interface McpTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  scopes: string[];
  anonymizeInstitutions: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export interface McpTokenStoreAdapter {
  findTokenByHash(hash: string): Promise<McpTokenRecord | null>;
  recordUsage?(tokenId: string): Promise<void>;
}

export interface TokenVerifierOptions {
  tokenStore?: McpTokenStoreAdapter;
  expectedAudience?: string;
  authServerUrl?: string;
}

export function hashPatToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export class TokenVerifier {
  private readonly tokenStore?: McpTokenStoreAdapter;
  private readonly expectedAudience: string;
  private readonly authServerUrl: string;

  constructor(options: TokenVerifierOptions = {}) {
    this.tokenStore = options.tokenStore;
    this.expectedAudience = options.expectedAudience ?? "https://mcp.flump.co.uk";
    this.authServerUrl = options.authServerUrl ?? "https://api.workos.com";
  }

  /**
   * RFC 9728 / OAuth 2.1 Protected Resource Metadata
   */
  getOAuthProtectedResourceMetadata() {
    return {
      resource: this.expectedAudience,
      authorization_servers: [this.authServerUrl],
      scopes_supported: ["mcp:read:anonymized", "mcp:read:full", "mcp:simulate"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://flump.co.uk/docs/mcp",
    };
  }

  /**
   * Verifies an Authorization header: "Bearer flump_pat_..." or "Bearer <jwt>"
   */
  async verifyAuthorizationHeader(authHeader?: string): Promise<VerifiedToken> {
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or malformed Authorization header. Expected: Bearer <token>");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new Error("Empty Bearer token provided.");
    }

    // 1. Personal Access Token (PAT)
    if (token.startsWith("flump_pat_")) {
      return this.verifyPat(token);
    }

    // 2. Mock / Dev token for local testing
    if (token === "mock-session-token" || token.startsWith("mock_mcp_")) {
      return {
        userId: "user_mock",
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        anonymizeInstitutions: true,
        type: "dev",
      };
    }

    // 3. OAuth 2.1 JWT Access Token
    return this.verifyOAuthJwt(token);
  }

  private async verifyPat(token: string): Promise<VerifiedToken> {
    const hash = hashPatToken(token);

    if (this.tokenStore) {
      const record = await this.tokenStore.findTokenByHash(hash);
      if (!record) {
        throw new Error("Invalid Personal Access Token.");
      }

      if (record.revokedAt) {
        throw new Error("This AI Connection token has been revoked.");
      }

      if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
        throw new Error("This AI Connection token has expired.");
      }

      // Record async telemetry if supported
      if (this.tokenStore.recordUsage) {
        this.tokenStore.recordUsage(record.id).catch((err) => {
          console.error("Failed to record MCP token usage telemetry:", err);
        });
      }

      const scopes = (record.scopes as McpScope[]) || ["mcp:read:anonymized", "mcp:simulate"];

      return {
        userId: record.userId,
        tokenId: record.id,
        scopes,
        anonymizeInstitutions: record.anonymizeInstitutions ?? true,
        type: "pat",
      };
    }

    // Fallback if no store is configured (e.g., local standalone CLI mode with inline PAT verification)
    return {
      userId: "cli_user",
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "pat",
    };
  }

  private async verifyOAuthJwt(token: string): Promise<VerifiedToken> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT token format.");
    }

    try {
      const payloadJson = Buffer.from(parts[1]!, "base64").toString("utf-8");
      const payload = JSON.parse(payloadJson);

      // Validate expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("OAuth token has expired.");
      }

      // Validate audience (RFC 8707)
      if (payload.aud) {
        const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (
          !audList.includes(this.expectedAudience) &&
          !audList.includes("https://mcp.flump.co.uk")
        ) {
          throw new Error(`Invalid token audience. Expected: ${this.expectedAudience}`);
        }
      }

      const userId = payload.sub || payload.userId;
      if (!userId) {
        throw new Error("Token payload missing subject / userId claim.");
      }

      const rawScope = payload.scope || payload.scopes;
      const scopes: McpScope[] = Array.isArray(rawScope)
        ? rawScope
        : typeof rawScope === "string"
          ? (rawScope.split(" ") as McpScope[])
          : ["mcp:read:anonymized", "mcp:simulate"];

      const anonymizeInstitutions = !scopes.includes("mcp:read:full");

      return {
        userId,
        scopes,
        anonymizeInstitutions,
        type: "oauth",
      };
    } catch (err) {
      throw new Error(`OAuth token verification failed: ${(err as Error).message}`);
    }
  }
}
