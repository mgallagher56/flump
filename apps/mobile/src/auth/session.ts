/**
 * The session controller (plan section 5.2): sign-in through the system browser sheet with PKCE,
 * restore on launch, refresh, and sign-out. Everything it touches is injected (`authDeps.ts` gives
 * the real ones), so every path is tested without a phone.
 *
 * Rules it keeps:
 * - The access token lives in memory only; the refresh token only in the token store.
 * - A new refresh token is saved before the new access token is used.
 * - Only a rejected refresh (WorkOS `invalid_grant`) or a refused fresh token ends a session and
 *   clears the device. A network failure never does.
 * - Sign-out clears the device first, with no network, then asks the backend to revoke the
 *   WorkOS session. It never opens a browser.
 * - The app never reads token lifetimes or the issuer: it refreshes when the API answers 401, and
 *   the backend checks the issuer. So a different lifetime or issuer cannot wrongly sign anyone in;
 *   a token the backend refuses ends the session (`checkAccount` gives `unauthorised`).
 */
import type { AuthConfig } from "../config";
import type { ServerSignOutResult } from "../data/serverSignOut";
import type { TokenResult, WorkosClient } from "../data/workos";
import { type AuthorizeScreen, buildAuthorizeUrl, parseCallback } from "./authorizeUrl";
import { createPkce, createState, type PkceCrypto } from "./pkce";
import {
  INITIAL_STATE,
  type SessionEvent,
  type SessionState,
  sessionReducer,
} from "./sessionMachine";
import type { TokenStore } from "./tokenStore";

/** What the system browser sheet returned: the redirect it stopped at, or nothing. */
export type BrowserResult = { type: "success"; url: string } | { type: "closed" };

/** The account check after sign-in: `GET /v1/user-profile` with the new token. */
export type AccountCheck =
  | "ok"
  | "not-invited"
  | "terms-not-accepted"
  | "unauthorised"
  | "unavailable";

/** As `@flump/api-client`'s `RefreshOutcome`. */
type RefreshOutcome = "refreshed" | "ended" | "retryable";

export interface SessionDeps {
  config: Pick<AuthConfig, "authBaseUrl" | "clientId" | "redirectUri">;
  crypto: PkceCrypto;
  workos: WorkosClient;
  tokens: TokenStore;
  openBrowser(url: string, redirectUri: string): Promise<BrowserResult>;
  checkAccount(): Promise<AccountCheck>;
  /** `POST /v1/session/sign-out` with exactly this access token: the backend revokes its `sid`. */
  endServerSession(accessToken: string): Promise<ServerSignOutResult>;
  /**
   * Runs once, before the first read of the store on launch: on iOS, clears a Keychain item left
   * by an earlier installation (`reinstall.ts`). Must not throw.
   */
  beforeFirstRestore?(): Promise<void>;
}

export interface Session {
  getState(): SessionState;
  subscribe(listener: (state: SessionState) => void): () => void;
  /** On launch: use a stored refresh token if there is one. */
  restore(): Promise<void>;
  /** From `restoredOffline`: try again. */
  retry(): Promise<void>;
  signIn(screen?: AuthorizeScreen): Promise<void>;
  signOut(): Promise<void>;
  /** For the API client: the access token in memory. */
  getAccessToken(): string | null;
  /** For the API client's `onUnauthorised`: one refresh shared by every caller. */
  refresh(): Promise<RefreshOutcome>;
}

export function createSession(deps: SessionDeps): Session {
  let state: SessionState = INITIAL_STATE;
  let accessToken: string | null = null;
  let refreshing: Promise<RefreshOutcome> | null = null;
  /**
   * Bumped whenever the device is cleared. A WorkOS answer that arrives after a clear (sign-out
   * during a refresh or a code exchange) belongs to a session that is gone and is dropped unsaved.
   */
  let epoch = 0;
  const listeners = new Set<(state: SessionState) => void>();

  function dispatch(event: SessionEvent) {
    const next = sessionReducer(state, event);
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  /** Clears memory and the store. The store's failure is not fatal: memory is already clear. */
  async function clearDevice() {
    epoch += 1;
    accessToken = null;
    await deps.tokens.clear();
  }

  async function endSession() {
    await clearDevice();
    dispatch({ type: "SESSION_ENDED" });
  }

  /**
   * Saves the new refresh token first; only then does the new access token go into use. Returns
   * false, saving nothing, when the device was cleared since `startedAt`.
   */
  async function adopt(result: Extract<TokenResult, { ok: true }>, startedAt: number) {
    if (epoch !== startedAt) return false;
    await deps.tokens.save(result.tokens.refreshToken);
    if (epoch !== startedAt) {
      // Cleared while saving: take the new token back out.
      await deps.tokens.clear();
      return false;
    }
    accessToken = result.tokens.accessToken;
    return true;
  }

  /** After new tokens: is this person on the beta, and does the API take the token? */
  async function settle() {
    const account = await deps.checkAccount();
    if (account === "ok") dispatch({ type: "SIGNED_IN" });
    else if (account === "not-invited") dispatch({ type: "NOT_INVITED" });
    else if (account === "terms-not-accepted") dispatch({ type: "TERMS_REQUIRED" });
    else if (account === "unavailable") dispatch({ type: "OFFLINE" });
    else await endSession();
  }

  function refresh(): Promise<RefreshOutcome> {
    if (!refreshing) {
      refreshing = (async (): Promise<RefreshOutcome> => {
        let stored: string | null;
        try {
          stored = await deps.tokens.read();
        } catch {
          return "retryable";
        }
        if (!stored) {
          await endSession();
          return "ended";
        }
        const startedAt = epoch;
        const result = await deps.workos.refresh(stored);
        // Signed out while WorkOS answered: nothing to save, nothing more to end.
        if (epoch !== startedAt) return "ended";
        if (result.ok) {
          try {
            if (!(await adopt(result, startedAt))) return "ended";
          } catch {
            // The store refused the new token. The old one may be spent; the next refresh will say.
            return "retryable";
          }
          return "refreshed";
        }
        if (result.reason === "rejected") {
          await endSession();
          return "ended";
        }
        return "retryable";
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  let prepared = false;

  async function restore() {
    if (state.status !== "loading") return;
    if (!prepared) {
      prepared = true;
      await deps.beforeFirstRestore?.();
    }
    let stored: string | null;
    try {
      stored = await deps.tokens.read();
    } catch {
      // The store could not be read now (an iPhone still locked): keep the token, try again later.
      return dispatch({ type: "OFFLINE" });
    }
    if (!stored) return dispatch({ type: "NO_SESSION" });
    const outcome = await refresh();
    if (outcome === "refreshed") await settle();
    else if (outcome === "retryable") dispatch({ type: "OFFLINE" });
    // "ended" has already moved to sessionEnded.
  }

  async function signIn(screen: AuthorizeScreen = "sign-in") {
    if (state.status !== "signedOut" && state.status !== "sessionEnded") return;
    dispatch({ type: "SIGN_IN_STARTED" });
    const startedAt = epoch;
    try {
      const { verifier, challenge } = await createPkce(deps.crypto);
      const expectedState = createState(deps.crypto);
      const url = buildAuthorizeUrl(deps.config, { challenge, state: expectedState }, screen);
      const browser = await deps.openBrowser(url, deps.config.redirectUri);
      if (browser.type !== "success") return dispatch({ type: "SIGN_IN_CANCELLED" });

      const callback = parseCallback(browser.url, deps.config.redirectUri, expectedState);
      if (callback.kind === "denied") return dispatch({ type: "SIGN_IN_FAILED", notice: "denied" });
      if (callback.kind !== "code") return dispatch({ type: "SIGN_IN_FAILED", notice: "failed" });

      const exchanged = await deps.workos.exchangeCode(callback.code, verifier);
      if (!exchanged.ok) {
        const notice = exchanged.reason === "unavailable" ? "unavailable" : "failed";
        return dispatch({ type: "SIGN_IN_FAILED", notice });
      }
      if (!(await adopt(exchanged, startedAt))) return;
      await settle();
    } catch {
      // The secure store or the browser failed. Leave nothing half signed in.
      await clearDevice();
      dispatch({ type: "SIGN_IN_FAILED", notice: "failed" });
    }
  }

  async function retry() {
    if (state.status !== "restoredOffline" && state.status !== "termsRequired") return;
    dispatch({ type: "RETRY_STARTED" });
    await restore();
  }

  async function signOut() {
    if (state.status === "signingOut") return;
    // Held in local variables only, for the server call after the device is clear.
    const heldAccess = accessToken;
    dispatch({ type: "SIGN_OUT_STARTED" });
    // Re-read: dispatch may have moved it (TypeScript still holds the earlier narrowing).
    if ((state as SessionState).status !== "signingOut") return;
    let heldRefresh: string | null = null;
    try {
      heldRefresh = await deps.tokens.read();
    } catch {
      // A locked store: the server call falls back to the access token alone.
    }
    await clearDevice();
    dispatch({ type: "SIGNED_OUT" });
    await endServerSession(heldAccess, heldRefresh);
  }

  /**
   * Asks the backend to revoke this sign-in's WorkOS session (E12 S2b, decided by a Fable decider
   * on 26 November 2026): no browser opens on either platform. Best effort and silent: the device
   * is already clear, and with no network the session lasts until WorkOS's own timeouts. If the
   * access token has expired (it lasts 300 seconds), one refresh is made in memory only, never
   * saved, and the call is tried once more with the new token.
   */
  async function endServerSession(access: string | null, refreshToken: string | null) {
    try {
      if (access) {
        const first = await deps.endServerSession(access);
        if (first !== "unauthorised") return;
      }
      if (!refreshToken) return;
      const fresh = await deps.workos.refresh(refreshToken);
      if (fresh.ok) await deps.endServerSession(fresh.tokens.accessToken);
    } catch {
      // Nothing to undo: the device is clear.
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    restore,
    retry,
    signIn,
    signOut,
    getAccessToken: () => accessToken,
    refresh,
  };
}
