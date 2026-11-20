import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, base64url without padding: 43 characters, matching `BetaInviteToken`. */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 of the raw token, hex. The only form of the token that is ever stored. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
