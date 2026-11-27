/**
 * The app lock as the session gate reads it (E12 S9): its phase, whether the signed-in shell must
 * be taken away (`locked`: locked, or still checking on a cold start), and whether an opaque cover
 * goes over the still-mounted shell (`switcherCover`). The cover is iOS only: while unlocked and
 * the app is not in the foreground (a system sheet, the app switcher), so the switcher's snapshot
 * shows no figures. Android needs none, since the lock sets FLAG_SECURE there. Neither the cover
 * nor a remount ever comes from the sign-in browser or the phone's own prompt.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import type { AppLock, AppLockPhase } from "./deviceLock";

const noSubscription = () => () => {};
const off = (): AppLockPhase => "off";

/** Whether the shell is taken away, not merely covered: nothing of it is rendered. */
export function lockHidesShell(phase: AppLockPhase): boolean {
  return phase === "checking" || phase === "locked" || phase === "noScreenLock";
}

/** Whether the cover goes over the mounted shell, for a phase, the app's state and the platform. */
export function lockCoversShell(
  phase: AppLockPhase,
  appState: AppStateStatus,
  exempt: boolean,
  os: typeof Platform.OS,
): boolean {
  if (phase !== "unlocked" || exempt || os !== "ios") return false;
  return appState === "background" || appState === "inactive";
}

export function useAppLock(lock: AppLock | undefined): {
  phase: AppLockPhase;
  locked: boolean;
  switcherCover: boolean;
} {
  const phase = useSyncExternalStore(
    lock ? lock.subscribe : noSubscription,
    lock ? lock.getPhase : off,
  );
  // React Native types `currentState` as a plain string; its values are the AppStateStatus ones.
  const [appState, setAppState] = useState<AppStateStatus>(
    () => (AppState.currentState as AppStateStatus | null) ?? "active",
  );
  useEffect(() => {
    if (!lock) return;
    void lock.start();
    const subscription = AppState.addEventListener("change", (next) => {
      lock.appStateChanged(next);
      setAppState(next);
    });
    return () => subscription.remove();
  }, [lock]);
  return {
    phase,
    locked: lockHidesShell(phase),
    switcherCover: lockCoversShell(phase, appState, lock?.isExempt() ?? false, Platform.OS),
  };
}
