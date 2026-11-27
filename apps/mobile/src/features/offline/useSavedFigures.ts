/**
 * The saved figures while restored offline (E12 S7), for the session gate's shell:
 * - loads the sealed cache into the query cache once per offline spell, and only while `canRead`
 *   (the signed-in shell is showing: never behind the app lock or the iOS app switcher cover);
 * - tries a quiet reconnect every 30 seconds and whenever the app comes back to the front;
 * - once signed in again, marks every read stale, so the screens fetch fresh figures at once.
 */
import { QueryClientContext } from "@tanstack/react-query";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { OfflineCache, SavedFigures } from "../../data/offlineCache";
import { queryKeys } from "../../data/queryKeys";

/** How often a quiet reconnect is tried while the app is open and offline. */
export const RECONNECT_EVERY_MS = 30_000;

export interface SavedFiguresState {
  /** The saved figures' oldest time, or null: none, too old, or not loaded. */
  saved: SavedFigures | null;
  /** The cache is still being read: neither the figures nor the offline screen yet. */
  restoring: boolean;
  /** A reconnect asked for by Try again is running. */
  checking: boolean;
  tryAgain(): void;
}

type Phase = "idle" | "restoring" | "done";

export function useSavedFigures({
  cache,
  offline,
  canRead,
  reconnect,
  isStillOffline,
}: {
  cache: OfflineCache | undefined;
  offline: boolean;
  /** The session's state read now, not at the last render: still restoredOffline? */
  isStillOffline: () => boolean;
  canRead: boolean;
  reconnect: () => Promise<void>;
}): SavedFiguresState {
  // Read without throwing: outside the data layer (a misconfigured build) nothing is restored.
  const queryClient = useContext(QueryClientContext);
  const [phase, setPhase] = useState<Phase>("idle");
  const [saved, setSaved] = useState<SavedFigures | null>(null);
  const [checking, setChecking] = useState(false);
  const wasOffline = useRef(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!offline) {
      setPhase("idle");
      setSaved(null);
      // Back online: what was read from the cache (or failed to load) is fetched again now.
      if (wasOffline.current) void queryClient?.invalidateQueries({ queryKey: queryKeys.all });
      wasOffline.current = false;
      return;
    }
    wasOffline.current = true;
    if (!cache || !queryClient || !canRead || phase !== "idle") return;
    setPhase("restoring");
    cache
      .restore(queryClient, isStillOffline)
      .catch(() => null)
      .then((figures) => {
        if (!mounted.current) return;
        setSaved(figures);
        setPhase("done");
      });
  }, [offline, canRead, cache, queryClient, phase, isStillOffline]);

  useEffect(() => {
    if (!offline || !canRead) return;
    const tryQuietly = () => {
      // Not from the background, where timers may still fire on Android.
      if (AppState.currentState !== "background") void reconnect();
    };
    const timer = setInterval(tryQuietly, RECONNECT_EVERY_MS);
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void reconnect();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [offline, canRead, reconnect]);

  const tryAgain = useCallback(() => {
    setChecking(true);
    void reconnect().finally(() => {
      if (mounted.current) setChecking(false);
    });
  }, [reconnect]);

  return {
    saved: offline ? saved : null,
    restoring: offline && Boolean(cache && queryClient) && phase !== "done",
    checking,
    tryAgain,
  };
}
