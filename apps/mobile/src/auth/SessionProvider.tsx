import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";
import type { Session } from "./session";
import { INITIAL_STATE, type SessionState } from "./sessionMachine";

export interface AppSession {
  session: Session;
  /** The marketing site, for the legal links on the sign-in screen. */
  marketingOrigin: string;
}

const SessionContext = createContext<AppSession | null>(null);

const noSubscription = () => () => {};
const initial = () => INITIAL_STATE;

/**
 * Holds the one session for the app and restores it on launch. `app` is null when the build's
 * config is bad: the first route then says so and nothing signs in.
 */
export function SessionProvider({
  app,
  children,
}: {
  app: AppSession | null;
  children: ReactNode;
}) {
  useEffect(() => {
    void app?.session.restore();
  }, [app]);
  return <SessionContext.Provider value={app}>{children}</SessionContext.Provider>;
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
