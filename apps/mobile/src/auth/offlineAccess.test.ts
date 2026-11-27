import { offlineAwareAccessToken } from "./offlineAccess";
import type { SessionState } from "./sessionMachine";

function fake(status: SessionState["status"], token: string | null) {
  const state = { status, token };
  const session = {
    getState: () => ({ status: state.status }) as SessionState,
    getAccessToken: () => state.token,
    reconnect: jest.fn(async () => {
      state.status = "signedIn";
      state.token = "access_after_reconnect";
    }),
  };
  return { session, state };
}

describe("the offline-aware access token", () => {
  it("restored offline with no token: waits for one quiet reconnect, then gives the new token", async () => {
    const { session } = fake("restoredOffline", null);
    expect(await offlineAwareAccessToken(session)()).toBe("access_after_reconnect");
    expect(session.reconnect).toHaveBeenCalledTimes(1);
  });

  it("restored offline and still unreachable: gives null, so the read fails and the figures stay", async () => {
    const { session } = fake("restoredOffline", null);
    session.reconnect.mockImplementationOnce(async () => {});
    expect(await offlineAwareAccessToken(session)()).toBeNull();
  });

  it("restored offline but already holding a token (the reconnect's own account check): no wait", async () => {
    const { session } = fake("restoredOffline", "access_held");
    expect(await offlineAwareAccessToken(session)()).toBe("access_held");
    expect(session.reconnect).not.toHaveBeenCalled();
  });

  it.each(["signedIn", "signedOut", "loading"] as const)("%s: never reconnects", async (status) => {
    const { session } = fake(status, null);
    expect(await offlineAwareAccessToken(session)()).toBeNull();
    expect(session.reconnect).not.toHaveBeenCalled();
  });
});
