/**
 * The saved figures while restored offline (E12 S7), for the session gate's shell:
 * - loads the sealed cache into the query cache once per offline spell, and only while `canRead`
 *   (the signed-in shell is showing: never behind the app lock or the iOS app switcher cover);
 * - tries a quiet reconnect every 30 seconds and whenever the app comes back to the front;
 * - once signed in again, marks every read stale, so the screens fetch fresh figures at once;
 * - checks the figures' age each minute while they show, and past 7 days (or with the clock turned
 *   back) forgets them and leaves the offline screen in their place.
 */
import { QueryClientContext } from "@tanstack/react-query";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { OfflineCache, SavedFigures } from "../../data/offlineCache";
import { queryKeys } from "../../data/queryKeys";

/**
 * When quiet reconnects are tried while the app is open and offline: soon at first, then less
 * often, at most every 30 seconds. The steps start again whenever the saved figures change (shown,
 * or forgotten for their age), since then no screen reads data and nothing else would try.
 */
export const RECONNECT_STEPS_MS = [5_000, 10_000, 20_000, 30_000] as const;
/** The longest wait between two quiet reconnects. */
export const RECONNECT_EVERY_MS = 30_000;
/** How often the saved figures' age is checked while they show. */
export const AGE_CHECK_EVERY_MS = 60_000;

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
  canReadNow,
}: {
  cache: OfflineCache | undefined;
  offline: boolean;
  /**
   * Read now, not at the last render: still restoredOffline, and nothing (the app lock, the iOS
   * switcher cover) over the shell? Asked right before the figures go into memory.
   */
  canReadNow: () => boolean;
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
      .restore(queryClient, canReadNow)
      .catch(() => null)
      .then((figures) => {
        if (!mounted.current) return;
        // Stopped because the lock came on (not because nothing was saved): try again once the
        // shell shows. After a sign-out the state is not offline, which resets this anyway.
        if (!figures && !canReadNow()) return setPhase("idle");
        setSaved(figures);
        setPhase("done");
      });
  }, [offline, canRead, cache, queryClient, phase, canReadNow]);

  // Past the age limit while on screen: forgotten, and the offline screen takes their place.
  useEffect(() => {
    if (!offline || !saved || !cache) return;
    const check = () => {
      if (cache.isFresh(saved.savedAt)) return;
      queryClient?.removeQueries({ queryKey: queryKeys.all });
      setSaved(null);
      void cache.wipe();
    };
    const timer = setInterval(check, AGE_CHECK_EVERY_MS);
    // iOS stops timers in the background: check again whenever the app comes back to the front.
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") check();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [offline, saved, cache, queryClient]);

  useEffect(() => {
    if (!offline || !canRead) return;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = RECONNECT_STEPS_MS[Math.min(step, RECONNECT_STEPS_MS.length - 1)];
      step += 1;
      timer = setTimeout(() => {
        // Not from the background, where timers may still fire on Android.
        if (AppState.currentState !== "background") void reconnect();
        schedule();
      }, wait);
    };
    schedule();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void reconnect();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [offline, canRead, reconnect, saved]);

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
