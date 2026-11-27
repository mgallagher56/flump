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
  | { status: "signingOut" }
  /**
   * The account's data is erased but its login is not yet removed (E12 S9): the delete answered
   * `identity_pending`, or a read answered 410 `account_deleted`. Repeating the delete finishes it.
   */
  | { status: "deletionPending" }
  /** The account is deleted and the device wiped, as at sign-out: the confirmation shows. */
  | { status: "accountDeleted" };

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
  | { type: "SESSION_ENDED" }
  | { type: "SIGN_OUT_STARTED" }
  | { type: "SIGNED_OUT" }
  | { type: "DELETION_PENDING" }
  | { type: "ACCOUNT_DELETED" }
  /** The person has read the deletion confirmation: on to the sign-in screen. */
  | { type: "DELETION_ACKNOWLEDGED" };

export const INITIAL_STATE: SessionState = { status: "loading" };

const SIGNED_OUT: SessionState = { status: "signedOut", notice: null };

/** Where each event may come from. Anything else is ignored. */
const FROM: { [E in SessionEvent["type"]]: readonly SessionState["status"][] } = {
  NO_SESSION: ["loading"],
  SIGN_IN_STARTED: ["signedOut", "sessionEnded"],
  SIGN_IN_CANCELLED: ["signingIn"],
  SIGN_IN_FAILED: ["signingIn"],
  // From restoredOffline too: a quiet reconnect (E12 S7) checks the account as sign-in does.
  SIGNED_IN: ["loading", "signingIn", "restoredOffline"],
  OFFLINE: ["loading", "signingIn"],
  // From the terms screen too: once agreed on the website, Try again checks the account again.
  RETRY_STARTED: ["restoredOffline", "termsRequired"],
  NOT_INVITED: ["loading", "signingIn", "restoredOffline"],
  TERMS_REQUIRED: ["loading", "signingIn", "restoredOffline"],
  // A rejected refresh can arrive in any signed-in state, including mid sign-in.
  SESSION_ENDED: [
    "loading",
    "signingIn",
    "signedIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
    "deletionPending",
  ],
  SIGN_OUT_STARTED: [
    "signedIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
    "sessionEnded",
    "deletionPending",
  ],
  SIGNED_OUT: ["signingOut"],
  // Found on launch, at sign-in or on a quiet reconnect (the account check answers 410), or after a
  // delete. A read while offline holds no token (a reconnect whose check failed drops it), so no
  // 410 comes from one.
  DELETION_PENDING: [
    "loading",
    "signingIn",
    "signedIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
  ],
  // The backend lets an uninvited person and one who has not agreed to the terms delete too.
  ACCOUNT_DELETED: ["signedIn", "notInvited", "termsRequired", "deletionPending"],
  DELETION_ACKNOWLEDGED: ["accountDeleted"],
};

/** Whether screens may hold the person's data: any other state drops the query cache. */
export function sessionHoldsData(status: SessionState["status"]): boolean {
  return status === "signedIn" || status === "restoredOffline";
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  if (!FROM[event.type].includes(state.status)) return state;
  switch (event.type) {
    case "NO_SESSION":
    case "SIGN_IN_CANCELLED":
    case "SIGNED_OUT":
    case "DELETION_ACKNOWLEDGED":
      return SIGNED_OUT;
    case "DELETION_PENDING":
      return { status: "deletionPending" };
    case "ACCOUNT_DELETED":
      return { status: "accountDeleted" };
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
    case "SESSION_ENDED":
      return { status: "sessionEnded" };
    case "SIGN_OUT_STARTED":
      return { status: "signingOut" };
  }
}
