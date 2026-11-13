import { Logger } from "@nestjs/common";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import type { AuthenticatedUser, TokenVerifier } from "./token-verifier";

/**
 * AuthKit access token issuer (user_management form). Source: @workos-inc/node
 * README ("Access token issuer validation").
 */
export function workosIssuer(clientId: string): string {
  return `https://api.workos.com/user_management/${clientId}`;
}

/**
 * The single accepted issuer. Derived from the configured client id (the owner
 * decoded a real staging token: iss is the user_management form, no `aud`).
 * WORKOS_ISSUER is an optional EXACT override for custom auth domains. It must
 * be an https URL. Throws at boot when it is invalid or when neither it nor a
 * client id is available. The issuer is public, not secret.
 */
export function resolveWorkosIssuer(
  clientId: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string {
  const override = env.WORKOS_ISSUER?.trim();
  if (override) {
    let url: URL;
    try {
      url = new URL(override);
    } catch {
      throw new Error("WORKOS_ISSUER must be a valid https URL");
    }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error("WORKOS_ISSUER must be a valid https URL");
    }
    return override;
  }
  if (!clientId) {
    throw new Error("WorkOS issuer is not configured: set WORKOS_CLIENT_ID (or WORKOS_ISSUER)");
  }
  return workosIssuer(clientId);
}

export function workosJwksFromUrl(clientId: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`));
}

export class WorkOsJwtVerifier implements TokenVerifier {
  private readonly logger = new Logger(WorkOsJwtVerifier.name);
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly clientId?: string;
  private readonly allowedAlgs: string[];

  constructor(opts: {
    jwks: JWTVerifyGetKey;
    issuer: string;
    /** When set, the token's `client_id` claim must equal it. */
    clientId?: string;
    allowedAlgs?: string[];
  }) {
    this.jwks = opts.jwks;
    this.issuer = opts.issuer;
    this.clientId = opts.clientId;
    this.allowedAlgs = opts.allowedAlgs ?? ["RS256"];
    this.logger.log(`expected token issuer: ${this.issuer}`);
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        algorithms: this.allowedAlgs,
        requiredClaims: ["exp"],
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new Error("missing sub");
      }
      if (this.clientId !== undefined && payload.client_id !== this.clientId) {
        throw Object.assign(new Error("client_id mismatch"), { claim: "client_id" });
      }
      return {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    } catch (error) {
      // Failure class, jose code and failing claim name only: never the token,
      // claim values or env values.
      const e = error as { code?: unknown; claim?: unknown };
      const parts = [error instanceof Error ? error.constructor.name : "unknown"];
      if (typeof e?.code === "string") parts.push(e.code);
      if (typeof e?.claim === "string") parts.push(`claim=${e.claim}`);
      this.logger.warn(`token verification failed: ${parts.join(" ")}`);
      throw new Error("invalid token");
    }
  }
}
