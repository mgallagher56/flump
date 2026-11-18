import { durations } from "@flump/tokens/native";
import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const STORAGE_KEY = "flump.setup-step-count";

export function getStoredStepCount(): number | null {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw !== null ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function storeStepCount(count: number): void {
  if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, String(count));
    } catch {
      // Ignored
    }
  }
}

export function clearStoredStepCount(): void {
  if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
  }
}

export interface UseSetupProgressOnceResult {
  /** The value to pass to the progress bar/ring. Transitions from old to new value on step completion. */
  currentValue: number;
  /** Whether the transition is actively running. */
  isAnimating: boolean;
}

/**
 * E17 Demo 4: Setup progress fills.
 * Tokens: `slow` (320ms), `standard`.
 * Plays once, the first time the dashboard is seen after a step is done. Never on later visits.
 * Reduced motion: The ring/bar is drawn at its new length immediately.
 */
export function useSetupProgressOnce(doneCount: number): UseSetupProgressOnceResult {
  const reducedMotion = usePrefersReducedMotion();
  const [currentValue, setCurrentValue] = useState(doneCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // A layout effect, so the ring moves back to the stored count before the first paint (no full
  // ring, then a replay from the old length).
  useIsomorphicLayoutEffect(() => {
    const stored = getStoredStepCount();

    if (stored === null || doneCount <= stored || reducedMotion) {
      // First visit, no new step, or reduced motion: drawn at its new length at once.
      storeStepCount(doneCount);
      setCurrentValue(doneCount);
      setIsAnimating(false);
      return;
    }

    // A step was done since the last view: fill from the stored count to the new one.
    setCurrentValue(stored);
    setIsAnimating(true);

    const frame = requestAnimationFrame(() => {
      setCurrentValue(doneCount);
    });

    // The count is saved only once the fill has played, so a re-run of this effect (StrictMode, or
    // reduced motion resolving after hydration) still sees the old count and never strands the ring.
    const timer = setTimeout(() => {
      storeStepCount(doneCount);
      setIsAnimating(false);
    }, durations.slow);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      setCurrentValue(doneCount);
      setIsAnimating(false);
    };
  }, [doneCount, reducedMotion]);

  return { currentValue, isAnimating };
}
