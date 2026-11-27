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
import { readClaims } from "./claims";
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
  | "unavailable"
  /** 410 `account_deleted`: the data is erased but the login remains (E12 S9). */
  | "account-deleted";

/** As `@flump/api-client`'s `RefreshOutcome`. */
type RefreshOutcome = "refreshed" | "ended" | "retryable";

/**
 * What a re-authentication for a recent sign-in came to (E12 S9). `confirmed`: the same person
 * signed in again and the session now carries the fresh sign-in. `differentAccount`: someone else
 * signed in; their tokens were dropped and the current session kept. Nothing else changes anything.
 */
export type ReauthResult =
  | "confirmed"
  | "differentAccount"
  | "cancelled"
  | "failed"
  | "unavailable";

/** The states a re-authentication may start from: signed in, with a live login. */
const REAUTH_FROM: readonly SessionState["status"][] = [
  "signedIn",
  "notInvited",
  "termsRequired",
  "deletionPending",
];

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
  /**
   * Clears what else the device keeps for this person (the app lock flag, export files; E12 S9).
   * Runs after the tokens are cleared on sign-out, session end and deletion. Never the theme.
   */
  wipeDevice?(): Promise<void>;
  /**
   * Forgets the offline cache (E12 S7). Runs with every wipe above, and also before every new
   * sign-in, on a launch with no stored session and when a re-sign-in brings back someone else, so
   * no cache ever outlives the session that saved it. Must not throw.
   */
  clearCache?(): Promise<void>;
}

export interface Session {
  getState(): SessionState;
  subscribe(listener: (state: SessionState) => void): () => void;
  /** On launch: use a stored refresh token if there is one. */
  restore(): Promise<void>;
  /** From `restoredOffline`: try again, showing the loading screen. */
  retry(): Promise<void>;
  /**
   * From `restoredOffline`, quietly (E12 S7): one refresh and account check while the saved figures
   * stay on screen. Signed in again on success; still offline on a network failure; ended only as
   * any refresh ends a session. Calls made while one runs share it. Never rejects.
   */
  reconnect(): Promise<void>;
  /** Whether the state is restoredOffline right now (E12 S7: the cache's last check). */
  isRestoredOffline(): boolean;
  signIn(screen?: AuthorizeScreen): Promise<void>;
  signOut(): Promise<void>;
  /** For the API client: the access token in memory. */
  getAccessToken(): string | null;
  /** For the API client's `onUnauthorised`: one refresh shared by every caller. */
  refresh(): Promise<RefreshOutcome>;
  /**
   * For a recent sign-in (E12 S9): the same system-browser sign-in, which always asks again
   * (`max_age=0`). Never leaves the current state and never deletes anything.
   */
  reauthenticate(): Promise<ReauthResult>;
  /** The delete answered `identity_pending`, or a read answered 410: show the last step. */
  deletionPending(): void;
  /** The delete answered `deleted`: wipe the device as sign-out does, with no server call. */
  accountDeleted(): Promise<void>;
  /** From the deletion confirmation, on to the sign-in screen. */
  acknowledgeDeletion(): void;
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

  /** Then the rest of what the device keeps for this person. Its failure stops nothing. */
  async function wipeRest() {
    await clearCache();
    try {
      await deps.wipeDevice?.();
    } catch {
      // The tokens are gone already; a flag or file left behind is swept on the next launch.
    }
  }

  /** The offline cache alone. Its failure stops nothing: its key is gone or it is never read. */
  async function clearCache() {
    try {
      await deps.clearCache?.();
    } catch {
      // `OfflineCache.wipe` never throws; a stand-in might.
    }
  }

  /**
   * The session leaves signedIn (or restoredOffline) before the wipe, which switches the app lock
   * off and allows screen capture: done the other way round, the gate would mount the signed-in
   * shell, unlocked and capturable, until the event came.
   */
  async function endSession() {
    await clearDevice();
    dispatch({ type: "SESSION_ENDED" });
    await wipeRest();
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
    else if (account === "not-invited") await leaveData({ type: "NOT_INVITED" });
    else if (account === "terms-not-accepted") await leaveData({ type: "TERMS_REQUIRED" });
    else if (account === "unavailable") dispatch({ type: "OFFLINE" });
    else if (account === "account-deleted") await leaveData({ type: "DELETION_PENDING" });
    else await endSession();
  }

  /**
   * A state where screens hold no figures (not invited, terms, an erased account): saved figures
   * from before must not come back on a later offline start, so the cache goes too (E12 S7).
   */
  async function leaveData(event: SessionEvent) {
    dispatch(event);
    await clearCache();
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
    if (!stored) {
      // Nobody is signed in: a cache left by a wipe that failed, or a restored backup, goes now.
      await clearCache();
      return dispatch({ type: "NO_SESSION" });
    }
    const outcome = await refresh();
    if (outcome === "refreshed") await settle();
    else if (outcome === "retryable") dispatch({ type: "OFFLINE" });
    // "ended" has already moved to sessionEnded.
  }

  async function signIn(screen: AuthorizeScreen = "sign-in") {
    if (state.status !== "signedOut" && state.status !== "sessionEnded") return;
    dispatch({ type: "SIGN_IN_STARTED" });
    // Every sign-in starts with no saved figures, whoever signed in last.
    await clearCache();
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

  let reconnecting: Promise<void> | null = null;

  function reconnect(): Promise<void> {
    if (state.status !== "restoredOffline") return Promise.resolve();
    if (!reconnecting) {
      reconnecting = (async () => {
        const outcome = await refresh();
        if (outcome !== "refreshed") return;
        if (state.status !== "restoredOffline") return;
        await settle();
        // Still offline (the account check did not answer): drop the new access token, so no read
        // goes to Flump before the check passes. The saved refresh token is kept for the next try.
        if (state.status === "restoredOffline") accessToken = null;
      })()
        .catch(() => undefined)
        .finally(() => {
          reconnecting = null;
        });
    }
    return reconnecting;
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
    await wipeRest();
    dispatch({ type: "SIGNED_OUT" });
    await endServerSession(heldAccess, heldRefresh);
  }

  /**
   * The account is deleted (E12 S9): the device is wiped exactly as at sign-out, but no server
   * sign-out is sent, since the login it would end is gone.
   */
  async function accountDeleted() {
    const status = state.status;
    if (
      status !== "signedIn" &&
      status !== "notInvited" &&
      status !== "termsRequired" &&
      status !== "deletionPending"
    ) {
      return;
    }
    await clearDevice();
    // Out of signedIn before the wipe switches the lock off, as in `endSession`.
    dispatch({ type: "ACCOUNT_DELETED" });
    await wipeRest();
  }

  let reauthenticating: Promise<ReauthResult> | null = null;

  function reauthenticate(): Promise<ReauthResult> {
    if (!REAUTH_FROM.includes(state.status)) return Promise.resolve("failed");
    if (!reauthenticating) {
      reauthenticating = runReauthentication().finally(() => {
        reauthenticating = null;
      });
    }
    return reauthenticating;
  }

  /**
   * The new tokens are adopted only when they name the same person as the current ones (`sub`):
   * otherwise someone else signed in, and their tokens are dropped unsaved. On a match the new
   * refresh token is saved first, then the access token is swapped, then the old WorkOS session is
   * revoked (best effort) when its `sid` differs from the new one. The state never changes, and
   * nothing is deleted.
   */
  async function runReauthentication(): Promise<ReauthResult> {
    const startedAt = epoch;
    try {
      const { verifier, challenge } = await createPkce(deps.crypto);
      const expectedState = createState(deps.crypto);
      const url = buildAuthorizeUrl(deps.config, { challenge, state: expectedState }, "sign-in");
      const browser = await deps.openBrowser(url, deps.config.redirectUri);
      if (browser.type !== "success") return "cancelled";
      const callback = parseCallback(browser.url, deps.config.redirectUri, expectedState);
      if (callback.kind !== "code") return "failed";
      const exchanged = await deps.workos.exchangeCode(callback.code, verifier);
      if (!exchanged.ok) return exchanged.reason === "unavailable" ? "unavailable" : "failed";
      // Signed out while the browser was open: the new tokens belong to nothing.
      if (epoch !== startedAt || !accessToken) return "failed";

      const heldAccess = accessToken;
      const currentSub = subjectOf(heldAccess);
      if (!currentSub || subjectOf(exchanged.tokens.accessToken) !== currentSub) {
        // Someone else's fresh session is ended too, so it does not linger; the current one stays.
        await revokeQuietly(exchanged.tokens.accessToken);
        // Belt and braces: no saved figure survives a second person signing in on this phone. The
        // current person's figures are saved again on their next read.
        await clearCache();
        return "differentAccount";
      }

      // One lock with refresh: wait out a refresh in flight (it would save the old session's
      // token after ours), then take the refresh slot before the first await, so a refresh asked
      // for while the new tokens go in joins them instead of rotating the old session's token.
      while (refreshing) await refreshing.catch(() => undefined);
      if (epoch !== startedAt) return "failed";
      let release: (outcome: RefreshOutcome) => void = () => {};
      const lock = new Promise<RefreshOutcome>((resolve) => {
        release = resolve;
      });
      refreshing = lock;
      const oldAccess = accessToken ?? heldAccess;
      let heldRefresh: string | null = null;
      let adopted = false;
      try {
        try {
          heldRefresh = await deps.tokens.read();
        } catch {
          // The old session is then revoked with the access token alone.
        }
        adopted = await adopt(exchanged, startedAt);
        release(adopted ? "refreshed" : "ended");
      } catch (error) {
        release("retryable");
        throw error;
      } finally {
        if (refreshing === lock) refreshing = null;
      }
      if (!adopted) return "failed";
      // WorkOS may hand back the same session through Android's Custom Tab: revoking it would end
      // the new sign-in. Only a session id that is readable in both and differs is revoked.
      const oldSid = sessionIdOf(oldAccess);
      const newSid = sessionIdOf(exchanged.tokens.accessToken);
      if (oldSid && newSid && oldSid !== newSid) {
        await endServerSession(oldAccess, heldRefresh);
      }
      return "confirmed";
    } catch {
      // The browser or the store failed: the current session carries on as it was.
      return "failed";
    }
  }

  async function revokeQuietly(access: string) {
    try {
      await deps.endServerSession(access);
    } catch {
      // Best effort.
    }
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
    reconnect,
    isRestoredOffline: () => state.status === "restoredOffline",
    signIn,
    signOut,
    getAccessToken: () => accessToken,
    refresh,
    reauthenticate,
    deletionPending: () => void leaveData({ type: "DELETION_PENDING" }),
    accountDeleted,
    acknowledgeDeletion: () => dispatch({ type: "DELETION_ACKNOWLEDGED" }),
  };
}

/** A string claim of a token, or null when it cannot be read. */
function claimOf(token: string, name: "sub" | "sid"): string | null {
  const value = readClaims(token)?.[name];
  return typeof value === "string" && value !== "" ? value : null;
}

/** The person a token names. */
const subjectOf = (token: string) => claimOf(token, "sub");
/** The WorkOS session a token belongs to. */
const sessionIdOf = (token: string) => claimOf(token, "sid");
