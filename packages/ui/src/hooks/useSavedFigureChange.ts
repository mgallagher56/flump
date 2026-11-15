import { durations } from "@flump/tokens/native";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export interface UseSavedFigureChangeOptions {
  /** Duration of figure fade-out in ms. Defaults to `durations.fast` (120ms). */
  fadeMs?: number;
  /** Duration of background wash in ms. Defaults to `durations.scene` (900ms). */
  washMs?: number;
}

export interface UseSavedFigureChangeResult<T> {
  /** The value currently displayed to the user. */
  displayedValue: T;
  /** True while the figure is fading out before swapping to the new value. */
  isOut: boolean;
  /** True while the pale teal wash animation is running. */
  isWashed: boolean;
}

/**
 * E17 Demo 1: Saved figure change.
 * Plays once when a balance or budget row changes on save, never on initial mount or re-render.
 *
 * Under motion-safe:
 * - Cross-fades the figure over `durations.fast` (120ms).
 * - A pale teal wash fades over `durations.scene` (900ms) with `easings.settle`.
 *
 * Under `prefers-reduced-motion`:
 * - Swaps the value immediately with no cross-fade and no wash.
 */
export function useSavedFigureChange<T>(
  value: T,
  options: UseSavedFigureChangeOptions = {},
): UseSavedFigureChangeResult<T> {
  const { fadeMs = durations.fast, washMs = durations.scene } = options;
  const reducedMotion = usePrefersReducedMotion();

  const [displayedValue, setDisplayedValue] = useState<T>(value);
  const [isOut, setIsOut] = useState(false);
  const [isWashed, setIsWashed] = useState(false);

  const isInitialMount = useRef(true);
  const previousValue = useRef<T>(value);

  useEffect(() => {
    // Never play on initial mount or when value hasn't changed
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousValue.current = value;
      return;
    }

    if (Object.is(previousValue.current, value)) {
      return;
    }

    previousValue.current = value;

    if (reducedMotion) {
      setDisplayedValue(value);
      setIsOut(false);
      setIsWashed(false);
      return;
    }

    // Step 1: Fade out old figure over fadeMs
    setIsOut(true);

    const fadeTimer = setTimeout(() => {
      // Step 2: Swap displayed value, fade figure in, start wash
      setDisplayedValue(value);
      setIsOut(false);
      setIsWashed(true);

      const washTimer = setTimeout(() => {
        setIsWashed(false);
      }, washMs);

      return () => clearTimeout(washTimer);
    }, fadeMs);

    return () => clearTimeout(fadeTimer);
  }, [value, fadeMs, washMs, reducedMotion]);

  return { displayedValue, isOut, isWashed };
}
