/**
 * The access token for the API client, offline-aware (E12 S7). Restored offline there is no access
 * token, so a read would fail at once with nothing sent. Instead the read first waits for one quiet
 * reconnect (`Session.reconnect`, shared by every read that asks while it runs): with Flump back,
 * the session is signed in again and the read goes ahead with the new token; without, it fails as
 * before and the saved figures stay on screen.
 *
 * Only while there is no token: the account check inside the reconnect itself already holds the new
 * token, so it never waits on the reconnect it belongs to.
 */
import type { Session } from "./session";

export function offlineAwareAccessToken(
  session: Pick<Session, "getState" | "getAccessToken" | "reconnect">,
): () => Promise<string | null> {
  return async () => {
    if (!session.getAccessToken() && session.getState().status === "restoredOffline") {
      await session.reconnect();
    }
    return session.getAccessToken();
  };
}
