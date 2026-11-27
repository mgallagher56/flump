/**
 * The phone's own connection signal (E12 S7 follow-up), from expo-network, which is part of the
 * Expo SDK. It says whether the phone has a network, not whether Flump answers: the session's quiet
 * reconnect still decides when the app is back. Injected (`createConnectivity`) so tests need no
 * phone.
 */
import type { NetworkState } from "expo-network";

export interface Connectivity {
  /** Called with true or false on subscribe (once known) and on each change. Returns a stop. */
  subscribe(listener: (online: boolean) => void): () => void;
}

type ConnectionState = Pick<NetworkState, "isConnected" | "isInternetReachable">;

/**
 * Online, offline, or not known. Only a clear "no" is offline: an unknown reachability (as while
 * Android is still checking a new network) never drops anyone to the offline state.
 */
export function onlineFrom(state: ConnectionState): boolean | null {
  if (state.isConnected === false || state.isInternetReachable === false) return false;
  if (state.isConnected === true) return true;
  return null;
}

/** The part of expo-network this uses. */
export interface NetworkModule {
  getNetworkStateAsync(): Promise<ConnectionState>;
  addNetworkStateListener(listener: (state: ConnectionState) => void): { remove(): void };
}

export function createConnectivity(network: NetworkModule): Connectivity {
  return {
    subscribe(listener) {
      let stopped = false;
      let last: boolean | null = null;
      const tell = (state: ConnectionState) => {
        const online = onlineFrom(state);
        if (stopped || online === null || online === last) return;
        last = online;
        listener(online);
      };
      const subscription = network.addNetworkStateListener(tell);
      network.getNetworkStateAsync().then(tell, () => {
        // No first answer: the listener still reports the next change.
      });
      return () => {
        stopped = true;
        subscription.remove();
      };
    },
  };
}
