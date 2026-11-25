import {
  INITIAL_STATE,
  type SessionEvent,
  type SessionState,
  sessionReducer,
} from "./sessionMachine";

const S = {
  loading: { status: "loading" },
  signedOut: { status: "signedOut", notice: null },
  signingIn: { status: "signingIn" },
  signedIn: { status: "signedIn" },
  restoredOffline: { status: "restoredOffline" },
  sessionEnded: { status: "sessionEnded" },
  notInvited: { status: "notInvited" },
  termsRequired: { status: "termsRequired" },
  signingOut: { status: "signingOut" },
} satisfies Record<SessionState["status"], SessionState>;

const ALL = Object.values(S) as SessionState[];

describe("sessionReducer", () => {
  it("starts loading", () => {
    expect(INITIAL_STATE).toEqual(S.loading);
  });

  // Every allowed transition, written out by hand from plan section 5.2.
  it.each<[SessionState, SessionEvent, SessionState]>([
    [S.loading, { type: "NO_SESSION" }, S.signedOut],
    [S.loading, { type: "SIGNED_IN" }, S.signedIn],
    [S.loading, { type: "OFFLINE" }, S.restoredOffline],
    [S.loading, { type: "NOT_INVITED" }, S.notInvited],
    [S.loading, { type: "TERMS_REQUIRED" }, S.termsRequired],
    [S.loading, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.signedOut, { type: "SIGN_IN_STARTED" }, S.signingIn],
    [{ status: "signedOut", notice: "denied" }, { type: "SIGN_IN_STARTED" }, S.signingIn],
    [S.sessionEnded, { type: "SIGN_IN_STARTED" }, S.signingIn],
    [S.signingIn, { type: "SIGN_IN_CANCELLED" }, S.signedOut],
    [
      S.signingIn,
      { type: "SIGN_IN_FAILED", notice: "denied" },
      { status: "signedOut", notice: "denied" },
    ],
    [
      S.signingIn,
      { type: "SIGN_IN_FAILED", notice: "failed" },
      { status: "signedOut", notice: "failed" },
    ],
    [
      S.signingIn,
      { type: "SIGN_IN_FAILED", notice: "unavailable" },
      { status: "signedOut", notice: "unavailable" },
    ],
    [S.signingIn, { type: "SIGNED_IN" }, S.signedIn],
    [S.signingIn, { type: "OFFLINE" }, S.restoredOffline],
    [S.signingIn, { type: "NOT_INVITED" }, S.notInvited],
    [S.signingIn, { type: "TERMS_REQUIRED" }, S.termsRequired],
    [S.signingIn, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.signedIn, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.restoredOffline, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.notInvited, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.termsRequired, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.restoredOffline, { type: "RETRY_STARTED" }, S.loading],
    [S.termsRequired, { type: "RETRY_STARTED" }, S.loading],
    [S.termsRequired, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.signedIn, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.restoredOffline, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.notInvited, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.sessionEnded, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.signingOut, { type: "SIGNED_OUT" }, S.signedOut],
  ])("%j + %j -> %j", (from, event, to) => {
    expect(sessionReducer(from, event)).toEqual(to);
  });

  it("ignores events that do not apply, so a late answer cannot revive a signed-out session", () => {
    const allowed = new Set([
      "loading:NO_SESSION",
      "loading:SIGNED_IN",
      "loading:OFFLINE",
      "loading:NOT_INVITED",
      "loading:TERMS_REQUIRED",
      "loading:SESSION_ENDED",
      "signedOut:SIGN_IN_STARTED",
      "sessionEnded:SIGN_IN_STARTED",
      "signingIn:SIGN_IN_CANCELLED",
      "signingIn:SIGN_IN_FAILED",
      "signingIn:SIGNED_IN",
      "signingIn:OFFLINE",
      "signingIn:NOT_INVITED",
      "signingIn:TERMS_REQUIRED",
      "signingIn:SESSION_ENDED",
      "signedIn:SESSION_ENDED",
      "restoredOffline:SESSION_ENDED",
      "notInvited:SESSION_ENDED",
      "termsRequired:SESSION_ENDED",
      "termsRequired:RETRY_STARTED",
      "termsRequired:SIGN_OUT_STARTED",
      "restoredOffline:RETRY_STARTED",
      "signedIn:SIGN_OUT_STARTED",
      "restoredOffline:SIGN_OUT_STARTED",
      "notInvited:SIGN_OUT_STARTED",
      "sessionEnded:SIGN_OUT_STARTED",
      "signingOut:SIGNED_OUT",
    ]);
    const events: SessionEvent[] = [
      { type: "NO_SESSION" },
      { type: "SIGN_IN_STARTED" },
      { type: "SIGN_IN_CANCELLED" },
      { type: "SIGN_IN_FAILED", notice: "failed" },
      { type: "SIGNED_IN" },
      { type: "OFFLINE" },
      { type: "RETRY_STARTED" },
      { type: "NOT_INVITED" },
      { type: "TERMS_REQUIRED" },
      { type: "SESSION_ENDED" },
      { type: "SIGN_OUT_STARTED" },
      { type: "SIGNED_OUT" },
    ];
    for (const state of ALL) {
      for (const event of events) {
        if (allowed.has(`${state.status}:${event.type}`)) continue;
        expect(sessionReducer(state, event)).toBe(state);
      }
    }
  });
});
