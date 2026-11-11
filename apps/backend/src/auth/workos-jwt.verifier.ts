import { Logger } from "@nestjs/common";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import type { AuthenticatedUser, TokenVerifier } from "./token-verifier";

/**
 * AuthKit access token issuer. Source: @workos-inc/node README ("Access token
 * issuer validation"). UNCONFIRMED against live tokens; see the E1 design spec.
 */
export function workosIssuer(clientId: string): string {
  return `https://api.workos.com/user_management/${clientId}`;
}

export function workosJwksFromUrl(clientId: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`));
}

export class WorkOsJwtVerifier implements TokenVerifier {
  private readonly logger = new Logger(WorkOsJwtVerifier.name);
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly allowedAlgs: string[];

  constructor(opts: {
    jwks: JWTVerifyGetKey;
    issuer: string;
    allowedAlgs?: string[];
  }) {
    this.jwks = opts.jwks;
    this.issuer = opts.issuer;
    this.allowedAlgs = opts.allowedAlgs ?? ["RS256"];
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        algorithms: this.allowedAlgs,
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new Error("missing sub");
      }
      return {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    } catch (error) {
      // Log the failure class only, never the token or claim values.
      this.logger.debug(
        `token verification failed: ${error instanceof Error ? error.constructor.name : "unknown"}`,
      );
      throw new Error("invalid token");
    }
  }
}
