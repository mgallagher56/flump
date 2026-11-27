import {
  INITIAL_STATE,
  type SessionEvent,
  type SessionState,
  sessionHoldsData,
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
  deletionPending: { status: "deletionPending" },
  accountDeleted: { status: "accountDeleted" },
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
    // Account deletion (E12 S9): an erased account found on launch, at sign-in or mid-session.
    [S.loading, { type: "DELETION_PENDING" }, S.deletionPending],
    [S.signingIn, { type: "DELETION_PENDING" }, S.deletionPending],
    [S.signedIn, { type: "DELETION_PENDING" }, S.deletionPending],
    [S.notInvited, { type: "DELETION_PENDING" }, S.deletionPending],
    [S.termsRequired, { type: "DELETION_PENDING" }, S.deletionPending],
    [S.signedIn, { type: "ACCOUNT_DELETED" }, S.accountDeleted],
    [S.notInvited, { type: "ACCOUNT_DELETED" }, S.accountDeleted],
    [S.termsRequired, { type: "ACCOUNT_DELETED" }, S.accountDeleted],
    [S.deletionPending, { type: "ACCOUNT_DELETED" }, S.accountDeleted],
    [S.deletionPending, { type: "SESSION_ENDED" }, S.sessionEnded],
    [S.deletionPending, { type: "SIGN_OUT_STARTED" }, S.signingOut],
    [S.accountDeleted, { type: "DELETION_ACKNOWLEDGED" }, S.signedOut],
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
      "loading:DELETION_PENDING",
      "signingIn:DELETION_PENDING",
      "signedIn:DELETION_PENDING",
      "notInvited:DELETION_PENDING",
      "termsRequired:DELETION_PENDING",
      // A quiet reconnect from restoredOffline checks the account as sign-in does (E12 S7).
      "restoredOffline:SIGNED_IN",
      "restoredOffline:NOT_INVITED",
      "restoredOffline:TERMS_REQUIRED",
      "restoredOffline:DELETION_PENDING",
      "signedIn:ACCOUNT_DELETED",
      "notInvited:ACCOUNT_DELETED",
      "termsRequired:ACCOUNT_DELETED",
      "deletionPending:ACCOUNT_DELETED",
      "deletionPending:SESSION_ENDED",
      "deletionPending:SIGN_OUT_STARTED",
      "accountDeleted:DELETION_ACKNOWLEDGED",
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
      { type: "DELETION_PENDING" },
      { type: "ACCOUNT_DELETED" },
      { type: "DELETION_ACKNOWLEDGED" },
    ];
    for (const state of ALL) {
      for (const event of events) {
        if (allowed.has(`${state.status}:${event.type}`)) continue;
        expect(sessionReducer(state, event)).toBe(state);
      }
    }
  });
});

describe("sessionHoldsData", () => {
  it("is true only while signed in or restored offline: every other state drops the cache", () => {
    const holding = ALL.filter((state) => sessionHoldsData(state.status)).map((s) => s.status);
    expect(holding.sort()).toEqual(["restoredOffline", "signedIn"]);
  });
});

describe("CONNECTION_LOST (the connection drops mid-session)", () => {
  it("moves signedIn to restoredOffline", () => {
    expect(sessionReducer({ status: "signedIn" }, { type: "CONNECTION_LOST" })).toEqual({
      status: "restoredOffline",
    });
  });

  it.each([
    "loading",
    "signingIn",
    "restoredOffline",
    "notInvited",
    "termsRequired",
    "signingOut",
    "sessionEnded",
    "deletionPending",
    "accountDeleted",
  ] as const)("leaves %s unchanged", (status) => {
    const state = { status } as SessionState;
    expect(sessionReducer(state, { type: "CONNECTION_LOST" })).toBe(state);
  });
});
