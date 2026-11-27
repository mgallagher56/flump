/**
 * Feeds the phone's connection into the one offline state (E12 S7 follow-up). A drop moves a
 * signed-in session to `restoredOffline`, as a launch with no network does; a return tries the quiet
 * reconnect at once (and once more after one already running), which signs the session in again only once Flump answers. Both calls do nothing
 * from any other state, so this can run for the life of the app.
 */
import type { Connectivity } from "../device/connectivity";
import type { Session } from "./session";

export function watchConnection(
  session: Pick<Session, "connectionLost" | "reconnect">,
  connectivity: Connectivity,
): () => void {
  return connectivity.subscribe((online) => {
    // A reconnect already running (the timed one) may have started before the network came back
    // and joining it would fail with it: try once more after it. The second does nothing once signed
    // in again.
    if (online) void session.reconnect().then(() => session.reconnect());
    else session.connectionLost();
  });
}
