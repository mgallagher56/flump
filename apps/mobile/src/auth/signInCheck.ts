/**
 * The S2a spike, kept as a development-only check (route `sign-in-check`, stripped from production
 * builds): after a real sign-in it answers the plan's section 5.1 questions about WorkOS and shows
 * only non-secret facts. It never shows, stores elsewhere or logs a token value, an email or a name.
 *
 * Questions: the issuer and the claim names; the access token's lifetime; whether a refresh works
 * with no client secret; whether the refresh token is replaced on use; whether the old one is then
 * refused; whether reusing it also kills its replacement; whether the backend accepts the token.
 */
import type { Tokens, WorkosClient } from "../data/workos";
import { readClaims } from "./claims";
import type { AccountCheck } from "./session";
import type { TokenStore } from "./tokenStore";

type CallOutcome = "accepted" | "rejected" | "unavailable";

export interface SignInCheckReport {
  readonly issuer: string | null;
  readonly claimNames: readonly string[];
  readonly accessLifetimeSeconds: number | null;
  readonly refreshWithoutSecret: CallOutcome;
  readonly refreshTokenReplaced: boolean | null;
  readonly oldRefreshTokenReused: CallOutcome | "not-tried";
  readonly replacementAfterReuse: CallOutcome | "not-tried";
  readonly backend: AccountCheck | "not-tried";
}

export interface SignInCheckDeps {
  tokens: TokenStore;
  workos: WorkosClient;
  /** `GET /v1/user-profile` with exactly this token: no refresh, no retry. */
  checkAccountWith(accessToken: string): Promise<AccountCheck>;
}

export class NotSignedInError extends Error {
  override readonly name = "NotSignedInError";
}

const outcome = (result: { ok: boolean; reason?: string }): CallOutcome =>
  result.ok ? "accepted" : result.reason === "rejected" ? "rejected" : "unavailable";

function describe(access: string) {
  const claims = readClaims(access) ?? {};
  const { iss, iat, exp } = claims;
  return {
    issuer: typeof iss === "string" ? iss : null,
    claimNames: Object.keys(claims).sort(),
    accessLifetimeSeconds: typeof iat === "number" && typeof exp === "number" ? exp - iat : null,
  };
}

export async function runSignInCheck(deps: SignInCheckDeps): Promise<SignInCheckReport> {
  const first = await deps.tokens.read();
  if (!first) throw new NotSignedInError("Sign in first.");

  const refreshed = await deps.workos.refresh(first);
  if (!refreshed.ok) {
    return {
      issuer: null,
      claimNames: [],
      accessLifetimeSeconds: null,
      refreshWithoutSecret: outcome(refreshed),
      refreshTokenReplaced: null,
      oldRefreshTokenReused: "not-tried",
      replacementAfterReuse: "not-tried",
      backend: "not-tried",
    };
  }
  const second: Tokens = refreshed.tokens;
  await deps.tokens.save(second.refreshToken);
  const replaced = second.refreshToken !== first;
  const backend = await deps.checkAccountWith(second.accessToken);

  let oldRefreshTokenReused: SignInCheckReport["oldRefreshTokenReused"] = "not-tried";
  let replacementAfterReuse: SignInCheckReport["replacementAfterReuse"] = "not-tried";
  if (replaced) {
    const reuse = await deps.workos.refresh(first);
    oldRefreshTokenReused = outcome(reuse);
    if (reuse.ok) {
      await deps.tokens.save(reuse.tokens.refreshToken);
    } else {
      // Does a refused reuse also end the replacement (reuse detection on the whole session)?
      const after = await deps.workos.refresh(second.refreshToken);
      replacementAfterReuse = outcome(after);
      if (after.ok) await deps.tokens.save(after.tokens.refreshToken);
      else if (after.reason === "rejected") await deps.tokens.clear();
    }
  }

  return {
    ...describe(second.accessToken),
    refreshWithoutSecret: "accepted",
    refreshTokenReplaced: replaced,
    oldRefreshTokenReused,
    replacementAfterReuse,
    backend,
  };
}
