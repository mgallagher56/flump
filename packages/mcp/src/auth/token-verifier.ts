import { createHash } from "node:crypto";

import { effectiveAnonymize, filterKnownScopes, type McpScope } from "./scopes.js";

export type { McpScope };

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
  /** Called by the transport once per authenticated request with the number of `tools/call` messages. */
  recordRequest?(tokenId: string, toolCalls: number): Promise<void>;
}

export interface TokenVerifierOptions {
  tokenStore?: McpTokenStoreAdapter;
  expectedAudience?: string;
  authServerUrl?: string;
  /** Dev-only: the one exact token accepted as the dev identity. Never set in production. */
  devToken?: string;
  devUserId?: string;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function hashPatToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export class TokenVerifier {
  private readonly tokenStore?: McpTokenStoreAdapter;
  private readonly expectedAudience: string;
  private readonly authServerUrl: string;
  private readonly devToken?: string;
  private readonly devUserId: string;

  constructor(options: TokenVerifierOptions = {}) {
    this.tokenStore = options.tokenStore;
    this.expectedAudience = options.expectedAudience ?? "flump-mcp";
    this.authServerUrl = options.authServerUrl ?? "https://api.workos.com";
    this.devToken = options.devToken || undefined;
    this.devUserId = options.devUserId ?? "dev_user";
  }

  /** Records one authenticated request (and its `tools/call` count) against a PAT. */
  async recordRequest(tokenId: string, toolCalls: number): Promise<void> {
    await this.tokenStore?.recordRequest?.(tokenId, toolCalls);
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
    };
  }

  /**
   * Verifies an Authorization header: "Bearer flump_pat_..." or "Bearer <jwt>"
   */
  async verifyAuthorizationHeader(authHeader?: string): Promise<VerifiedToken> {
    const match = authHeader ? /^bearer\s+(.*)$/i.exec(authHeader) : null;
    if (!match) {
      throw new AuthenticationError(
        "Missing or malformed Authorization header. Expected: Bearer <token>",
      );
    }

    const token = (match[1] ?? "").trim();
    if (!token) {
      throw new AuthenticationError("Empty Bearer token provided.");
    }

    // 1. Personal Access Token (PAT)
    if (token.startsWith("flump_pat_")) {
      return this.verifyPat(token);
    }

    // 2. Dev token (only when explicitly configured; exact match)
    if (this.devToken && token === this.devToken) {
      return {
        userId: this.devUserId,
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        anonymizeInstitutions: true,
        type: "dev",
      };
    }

    // 3. OAuth JWTs are not verified (no signature check), so they are rejected until
    // the OAuth ticket adds real verification.
    throw new AuthenticationError("OAuth tokens are not enabled");
  }

  private async verifyPat(token: string): Promise<VerifiedToken> {
    const hash = hashPatToken(token);

    if (this.tokenStore) {
      const record = await this.tokenStore.findTokenByHash(hash);
      if (!record) {
        throw new AuthenticationError("Invalid Personal Access Token.");
      }

      if (record.revokedAt) {
        throw new AuthenticationError("This AI Connection token has been revoked.");
      }

      if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
        throw new AuthenticationError("This AI Connection token has expired.");
      }

      const scopes = filterKnownScopes(record.scopes ?? ["mcp:read:anonymized", "mcp:simulate"]);

      return {
        userId: record.userId,
        tokenId: record.id,
        scopes,
        anonymizeInstitutions: effectiveAnonymize(record.anonymizeInstitutions, scopes),
        type: "pat",
      };
    }

    throw new AuthenticationError("Invalid Personal Access Token.");
  }
}
