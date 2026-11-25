/**
 * When a loading state may show (plan 9.6 acceptance 5, web's pending timing): nothing for the
 * first `durations.pendingDelay` (200 ms), so a quick answer never flashes a skeleton; once shown,
 * it stays at least `durations.pendingMinimum` (400 ms), so it never blinks.
 */
import { durations } from "@flump/tokens/native";
import { useEffect, useRef, useState } from "react";

export interface DelayedLoadingOptions {
  delayMs?: number;
  minimumMs?: number;
  /** Injected clock for tests; defaults to `Date.now`. */
  now?: () => number;
}

export function useDelayedLoading(loading: boolean, options: DelayedLoadingOptions = {}): boolean {
  const {
    delayMs = durations.pendingDelay,
    minimumMs = durations.pendingMinimum,
    now = Date.now,
  } = options;
  const [shown, setShown] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      if (shownAt.current !== null) return;
      const timer = setTimeout(() => {
        shownAt.current = now();
        setShown(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
    if (shownAt.current === null) return;
    const left = minimumMs - (now() - shownAt.current);
    const hide = () => {
      shownAt.current = null;
      setShown(false);
    };
    if (left <= 0) {
      hide();
      return;
    }
    const timer = setTimeout(hide, left);
    return () => clearTimeout(timer);
  }, [loading, delayMs, minimumMs, now]);

  return shown;
}
