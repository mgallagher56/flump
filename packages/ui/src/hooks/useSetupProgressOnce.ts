import { durations } from "@flump/tokens/native";
import { useEffect, useRef, useState } from "react";
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

  const isInitialMount = useRef(true);

  useEffect(() => {
    const stored = getStoredStepCount();

    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (stored !== null && doneCount > stored && !reducedMotion) {
        // Step was completed! Animate from previous count to new count
        setCurrentValue(stored);
        storeStepCount(doneCount);
        setIsAnimating(true);

        const frame = requestAnimationFrame(() => {
          setCurrentValue(doneCount);
        });

        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, durations.slow);

        return () => {
          cancelAnimationFrame(frame);
          clearTimeout(timer);
        };
      }

      // First visit, no change, or reduced motion: immediate length
      storeStepCount(doneCount);
      setCurrentValue(doneCount);
      setIsAnimating(false);
      return;
    }

    if (stored !== null && doneCount !== stored) {
      storeStepCount(doneCount);
      setCurrentValue(doneCount);
      if (!reducedMotion) {
        setIsAnimating(true);
        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, durations.slow);
        return () => clearTimeout(timer);
      }
    }
  }, [doneCount, reducedMotion]);

  return { currentValue, isAnimating };
}
