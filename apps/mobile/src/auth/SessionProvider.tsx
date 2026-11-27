import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";
import type { ApiClient } from "../data/apiClient";
import type { UpdateCheck } from "../data/clientPolicy";
import type { OfflineCache } from "../data/offlineCache";
import type { AccountDataActions } from "../features/account-data/useAccountData";
import type { AppLock } from "./deviceLock";
import type { Session } from "./session";
import { INITIAL_STATE, type SessionState } from "./sessionMachine";

export interface AppSession {
  session: Session;
  /** The marketing site, for the legal links on the sign-in screen. */
  marketingOrigin: string;
  /** The web app, for pages the app does not have yet (S4); null links them to the marketing site. */
  webAppOrigin?: string | null;
  /** The app's one API client, whose 401s ask this session to refresh (S3: screens read through it). */
  api?: ApiClient;
  /** The version gate: true when this build is below the server's minimum (plan section 4.9). */
  checkForUpdate?: UpdateCheck;
  /** "Download your data" and "Delete your account", with this session's token (E12 S9). */
  accountData?: AccountDataActions;
  /** The optional app lock on this phone (E12 S9); absent where the build has no lock module. */
  appLock?: AppLock;
  /** The sealed offline cache (E12 S7); absent where the platform gives no cache folder. */
  offlineCache?: OfflineCache;
}

/** Why there is no session: a bad config value, or native modules this app binary lacks. */
export type StartProblem = { kind: "misconfigured" } | { kind: "unavailable"; missing: string[] };

const SessionContext = createContext<AppSession | null>(null);
const StartProblemContext = createContext<StartProblem>({ kind: "misconfigured" });

const noSubscription = () => () => {};
const initial = () => INITIAL_STATE;

/**
 * Holds the one session for the app and restores it on launch. `app` is null when the build's
 * config is bad: the first route then says so and nothing signs in.
 */
export function SessionProvider({
  app,
  problem = { kind: "misconfigured" },
  children,
}: {
  app: AppSession | null;
  problem?: StartProblem;
  children: ReactNode;
}) {
  useEffect(() => {
    void app?.session.restore();
  }, [app]);
  return (
    <StartProblemContext.Provider value={problem}>
      <SessionContext.Provider value={app}>{children}</SessionContext.Provider>
    </StartProblemContext.Provider>
  );
}

/** Why sign-in is off when `useSession` gives null. */
export function useStartProblem(): StartProblem {
  return useContext(StartProblemContext);
}

/** The session and its state, or null in a misconfigured build. */
export function useSession(): (AppSession & { state: SessionState }) | null {
  const app = useContext(SessionContext);
  const state = useSyncExternalStore(
    app
      ? (listener) => {
          const unsubscribe = app.session.subscribe(listener);
          return () => void unsubscribe();
        }
      : noSubscription,
    app ? app.session.getState : initial,
  );
  return app ? { ...app, state } : null;
}
