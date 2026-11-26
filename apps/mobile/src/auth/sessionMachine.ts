/**
 * The session states and their transitions (plan section 5.2), as a pure reducer. An event that does
 * not apply to the current state leaves it unchanged, so a late answer from an old sign-in cannot
 * move a session that has since signed out.
 */

/** Why the sign-in screen shows a message. A cancelled sign-in shows none. */
export type SignInNotice = "denied" | "failed" | "unavailable";

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut"; notice: SignInNotice | null }
  | { status: "signingIn" }
  | { status: "signedIn" }
  /** A refresh token is kept but Flump could not be reached: nothing is cleared. */
  | { status: "restoredOffline" }
  /** WorkOS rejected the refresh token, or the API refused a fresh token; the device is cleared. */
  | { status: "sessionEnded" }
  | { status: "notInvited" }
  /** Signed in, but the API answers 403 `terms_not_accepted` until the terms are agreed on the website. */
  | { status: "termsRequired" }
  /**
   * Signed in, but the API's answer is not one this version of the app understands (version skew:
   * an older or newer backend). Nothing is cleared; this is not "offline".
   */
  | { status: "outOfStep" }
  | { status: "signingOut" };

export type SessionEvent =
  | { type: "NO_SESSION" }
  | { type: "SIGN_IN_STARTED" }
  | { type: "SIGN_IN_CANCELLED" }
  | { type: "SIGN_IN_FAILED"; notice: SignInNotice }
  | { type: "SIGNED_IN" }
  | { type: "OFFLINE" }
  | { type: "RETRY_STARTED" }
  | { type: "NOT_INVITED" }
  | { type: "TERMS_REQUIRED" }
  | { type: "OUT_OF_STEP" }
  | { type: "SESSION_ENDED" }
  | { type: "SIGN_OUT_STARTED" }
  | { type: "SIGNED_OUT" };

export const INITIAL_STATE: SessionState = { status: "loading" };

const SIGNED_OUT: SessionState = { status: "signedOut", notice: null };

/** Where each event may come from. Anything else is ignored. */
const FROM: { [E in SessionEvent["type"]]: readonly SessionState["status"][] } = {
  NO_SESSION: ["loading"],
  SIGN_IN_STARTED: ["signedOut", "sessionEnded"],
  SIGN_IN_CANCELLED: ["signingIn"],
  SIGN_IN_FAILED: ["signingIn"],
  SIGNED_IN: ["loading", "signingIn"],
  OFFLINE: ["loading", "signingIn"],
  // From the terms screen too: once agreed on the website, Try again checks the account again.
  RETRY_STARTED: ["restoredOffline", "termsRequired", "outOfStep"],
  NOT_INVITED: ["loading", "signingIn"],
  TERMS_REQUIRED: ["loading", "signingIn"],
  OUT_OF_STEP: ["loading", "signingIn"],
  // A rejected refresh can arrive in any signed-in state, including mid sign-in.
  SESSION_ENDED: [
    "loading",
    "signingIn",
    "signedIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
    "outOfStep",
  ],
  SIGN_OUT_STARTED: [
    "signedIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
    "outOfStep",
    "sessionEnded",
  ],
  SIGNED_OUT: ["signingOut"],
};

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  if (!FROM[event.type].includes(state.status)) return state;
  switch (event.type) {
    case "NO_SESSION":
    case "SIGN_IN_CANCELLED":
    case "SIGNED_OUT":
      return SIGNED_OUT;
    case "SIGN_IN_STARTED":
      return { status: "signingIn" };
    case "SIGN_IN_FAILED":
      return { status: "signedOut", notice: event.notice };
    case "SIGNED_IN":
      return { status: "signedIn" };
    case "OFFLINE":
      return { status: "restoredOffline" };
    case "RETRY_STARTED":
      return { status: "loading" };
    case "NOT_INVITED":
      return { status: "notInvited" };
    case "TERMS_REQUIRED":
      return { status: "termsRequired" };
    case "OUT_OF_STEP":
      return { status: "outOfStep" };
    case "SESSION_ENDED":
      return { status: "sessionEnded" };
    case "SIGN_OUT_STARTED":
      return { status: "signingOut" };
  }
}
