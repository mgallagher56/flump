import { durations } from "@flump/tokens/native";
import { useEffect, useRef, useState } from "react";

export interface DelayedPendingOptions {
  /** How long a wait runs before loading UI shows. Defaults to `durations.pendingDelay` (200ms). */
  delayMs?: number;
  /** The shortest time loading UI stays once shown. Defaults to `durations.pendingMinimum` (400ms). */
  minimumMs?: number;
}

/**
 * The one loading-UI timer (UX-GUIDELINES "Loading"). Returns whether loading UI (a progress bar, a
 * skeleton) should show for a wait that is `pending`:
 * - nothing for the first `delayMs`, so a fast load shows no loading UI at all;
 * - once shown, at least `minimumMs`, so it never blinks on and off.
 * Use it for every loading state; never start a page-level timer of your own.
 */
export function useDelayedPending(pending: boolean, options: DelayedPendingOptions = {}): boolean {
  const { delayMs = durations.pendingDelay, minimumMs = durations.pendingMinimum } = options;
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (pending && !shown) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
    if (!pending && shown) {
      const remaining = minimumMs - (Date.now() - shownAt.current);
      if (remaining <= 0) {
        setShown(false);
        return;
      }
      const timer = setTimeout(() => setShown(false), remaining);
      return () => clearTimeout(timer);
    }
    return;
  }, [pending, shown, delayMs, minimumMs]);

  return shown;
}
