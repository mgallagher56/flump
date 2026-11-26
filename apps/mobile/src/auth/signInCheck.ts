/**
 * The S2a spike, kept as a development-only check (route `sign-in-check`, stripped from production
 * builds): after a real sign-in it answers the plan's section 5.1 questions about WorkOS and shows
 * only non-secret facts. It never shows, stores elsewhere or logs a token value, an email or a name.
 *
 * Questions: the issuer and the claim names; the access token's lifetime; whether a refresh works
 * with no client secret; whether the refresh token is replaced on use; whether the old one is then
 * refused at once; if not, whether it gives back the same new tokens (WorkOS's 30 second grace
 * period) and is refused after waiting past it; and whether the newest token still works after all
 * that (no reuse detection ending the session). Also whether the backend accepts the token. Last,
 * the decisive test (Fable decider, PR #951): it signs out on the server, then sends the old and the
 * newest refresh token; both must be refused. It therefore ends with the person signed out.
 */
import type { ServerSignOutResult } from "../data/serverSignOut";
import type { Tokens, WorkosClient } from "../data/workos";
import { readClaims } from "./claims";
import type { AccountCheck } from "./session";
import type { TokenStore } from "./tokenStore";

type CallOutcome = "accepted" | "rejected" | "unavailable";

/** Past WorkOS's documented 30 second grace period, with room for a slow clock or network. */
export const REUSE_WAIT_MS = 65_000;

export interface SignInCheckReport {
  readonly issuer: string | null;
  readonly claimNames: readonly string[];
  readonly accessLifetimeSeconds: number | null;
  readonly refreshWithoutSecret: CallOutcome;
  readonly refreshTokenReplaced: boolean | null;
  /** The old refresh token sent again straight after the refresh. */
  readonly oldRefreshTokenReused: CallOutcome | "not-tried";
  /** When that reuse was accepted: did it give back the same new refresh token? */
  readonly reuseGaveSameTokens: boolean | null;
  /** The old refresh token sent again after `REUSE_WAIT_MS`, when the first reuse was accepted. */
  readonly oldRefreshTokenAfterWait: CallOutcome | "not-tried";
  /** The newest refresh token after all the reuse: still working means no reuse detection. */
  readonly replacementAfterReuse: CallOutcome | "not-tried";
  /** When the late reuse was accepted: did it give back the newest pair, or fork a new one? */
  readonly lateReuseGaveSameTokens: boolean | null;
  /** `POST /v1/session/sign-out` with the newest access token. */
  readonly serverSignOut: ServerSignOutResult | "not-tried";
  /** After that sign-out: the first refresh token, then the newest. Both must be `rejected`. */
  readonly oldRefreshTokenAfterSignOut: CallOutcome | "not-tried";
  readonly newestRefreshTokenAfterSignOut: CallOutcome | "not-tried";
  readonly backend: AccountCheck | "not-tried";
}

export interface SignInCheckDeps {
  tokens: TokenStore;
  workos: WorkosClient;
  /** `GET /v1/user-profile` with exactly this token: no refresh, no retry. */
  checkAccountWith(accessToken: string): Promise<AccountCheck>;
  /** Waits `ms` (a timer on the phone; instant in tests). */
  wait(ms: number): Promise<void>;
  /** The app's server sign-out, with exactly this access token. */
  endServerSession(accessToken: string): Promise<ServerSignOutResult>;
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
      reuseGaveSameTokens: null,
      oldRefreshTokenAfterWait: "not-tried",
      replacementAfterReuse: "not-tried",
      lateReuseGaveSameTokens: null,
      serverSignOut: "not-tried",
      oldRefreshTokenAfterSignOut: "not-tried",
      newestRefreshTokenAfterSignOut: "not-tried",
      backend: "not-tried",
    };
  }
  const second: Tokens = refreshed.tokens;
  await deps.tokens.save(second.refreshToken);
  const replaced = second.refreshToken !== first;
  const backend = await deps.checkAccountWith(second.accessToken);

  let oldRefreshTokenReused: SignInCheckReport["oldRefreshTokenReused"] = "not-tried";
  let reuseGaveSameTokens: boolean | null = null;
  let oldRefreshTokenAfterWait: SignInCheckReport["oldRefreshTokenAfterWait"] = "not-tried";
  let replacementAfterReuse: SignInCheckReport["replacementAfterReuse"] = "not-tried";
  let lateReuseGaveSameTokens: boolean | null = null;
  let serverSignOut: SignInCheckReport["serverSignOut"] = "not-tried";
  let oldRefreshTokenAfterSignOut: SignInCheckReport["oldRefreshTokenAfterSignOut"] = "not-tried";
  let newestRefreshTokenAfterSignOut: SignInCheckReport["newestRefreshTokenAfterSignOut"] =
    "not-tried";
  if (replaced) {
    // The newest refresh token so far: always the one kept in the store.
    let newest = second.refreshToken;
    const reuse = await deps.workos.refresh(first);
    oldRefreshTokenReused = outcome(reuse);
    if (reuse.ok) {
      reuseGaveSameTokens = reuse.tokens.refreshToken === second.refreshToken;
      newest = reuse.tokens.refreshToken;
      await deps.tokens.save(newest);
      // A grace period, or no rotation check at all? Try again once it would be over.
      await deps.wait(REUSE_WAIT_MS);
      const late = await deps.workos.refresh(first);
      oldRefreshTokenAfterWait = outcome(late);
      if (late.ok) {
        lateReuseGaveSameTokens = late.tokens.refreshToken === newest;
        newest = late.tokens.refreshToken;
        await deps.tokens.save(newest);
      }
    }
    // Does any of that reuse also end the session (reuse detection)?
    const after = await deps.workos.refresh(newest);
    replacementAfterReuse = outcome(after);
    if (after.ok) {
      await deps.tokens.save(after.tokens.refreshToken);
      // The decisive test: after a server sign-out, no refresh token of this session may work.
      serverSignOut = await deps.endServerSession(after.tokens.accessToken);
      oldRefreshTokenAfterSignOut = outcome(await deps.workos.refresh(first));
      newestRefreshTokenAfterSignOut = outcome(
        await deps.workos.refresh(after.tokens.refreshToken),
      );
      await deps.tokens.clear();
    } else if (after.reason === "rejected") {
      await deps.tokens.clear();
    }
  }

  return {
    ...describe(second.accessToken),
    refreshWithoutSecret: "accepted",
    refreshTokenReplaced: replaced,
    oldRefreshTokenReused,
    reuseGaveSameTokens,
    oldRefreshTokenAfterWait,
    replacementAfterReuse,
    lateReuseGaveSameTokens,
    serverSignOut,
    oldRefreshTokenAfterSignOut,
    newestRefreshTokenAfterSignOut,
    backend,
  };
}
