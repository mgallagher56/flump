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
 * Accepted issuers. The WorkOS SDKs disagree on the form (authkit-react-router
 * defaults to the bare host), so both are accepted by default. WORKOS_ISSUER
 * (comma-separated) REPLACES the defaults, for custom auth domains. Decode one
 * real token's `iss` before the first deploy.
 */
export function workosIssuers(
  clientId: string,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const custom = (env.WORKOS_ISSUER ?? "")
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i.length > 0);
  return custom.length > 0 ? custom : ["https://api.workos.com", workosIssuer(clientId)];
}

export function workosJwksFromUrl(clientId: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`));
}

export class WorkOsJwtVerifier implements TokenVerifier {
  private readonly logger = new Logger(WorkOsJwtVerifier.name);
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string | string[];
  private readonly allowedAlgs: string[];

  constructor(opts: {
    jwks: JWTVerifyGetKey;
    issuer: string | string[];
    allowedAlgs?: string[];
  }) {
    this.jwks = opts.jwks;
    this.issuer = opts.issuer;
    this.allowedAlgs = opts.allowedAlgs ?? ["RS256"];
    this.logger.log(`expected token issuers: ${[this.issuer].flat().join(", ")}`);
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
