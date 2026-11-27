/**
 * Feeds the phone's connection into the one offline state (E12 S7 follow-up). A drop moves a
 * signed-in session to `restoredOffline`, as a launch with no network does; a return tries the quiet
 * reconnect at once, which signs the session in again only once Flump answers. Both calls do nothing
 * from any other state, so this can run for the life of the app.
 */
import type { Connectivity } from "../device/connectivity";
import type { Session } from "./session";

export function watchConnection(
  session: Pick<Session, "connectionLost" | "reconnect">,
  connectivity: Connectivity,
): () => void {
  return connectivity.subscribe((online) => {
    if (online) void session.reconnect();
    else session.connectionLost();
  });
}
