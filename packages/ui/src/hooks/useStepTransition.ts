import { durations } from "@flump/tokens/native";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export type StepDirection = "next" | "back" | "none";
export type StepAnimationState = "idle" | "enterNext" | "enterBack";

export interface UseStepTransitionOptions {
  /** Explicit direction override ("next" or "back"). When not provided, index comparison is used. */
  direction?: StepDirection;
  /** Duration of card enter animation in ms. Defaults to durations.base (200ms). */
  enterMs?: number;
}

export interface UseStepTransitionResult<T> {
  /** The step currently rendered in the DOM. */
  displayedStep: T;
  /** Current animation phase. */
  animationState: StepAnimationState;
  /** True while the transition between steps is actively running. */
  isTransitioning: boolean;
}

/**
 * E17 Demo 3: Check-in moving between accounts.
 * - Next: arrives over `base` (200ms) `enter` with 24px travel (`slideInRight`).
 * - Back: arrives over `base` (200ms) `enter` with -24px travel (`slideInLeft`).
 * - Reduced motion: the same enter states, which the consumer's recipe draws as a short fade over
 *   `fast` with no travel.
 * - Renders the next step immediately so input is never delayed and focus moves correctly. For
 *   that reason there is no leave phase: the old step is never held on screen while it exits.
 */
export function useStepTransition<T>(
  step: T,
  stepIndex: number,
  options: UseStepTransitionOptions = {},
): UseStepTransitionResult<T> {
  const { direction: explicitDirection, enterMs = durations.base } = options;
  const reducedMotion = usePrefersReducedMotion();

  const [displayedStep, setDisplayedStep] = useState<T>(step);
  const [animationState, setAnimationState] = useState<StepAnimationState>("idle");

  const prevIndex = useRef(stepIndex);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevIndex.current = stepIndex;
      setDisplayedStep(step);
      return;
    }

    if (prevIndex.current === stepIndex) {
      setDisplayedStep(step);
      return;
    }

    const direction: StepDirection =
      explicitDirection ?? (stepIndex > prevIndex.current ? "next" : "back");
    prevIndex.current = stepIndex;
    setDisplayedStep(step);

    // Reduced motion keeps the enter state: the recipe swaps the travel for a short fade over
    // `fast`, so the state lasts that long instead of the full arrival.
    const enterState: StepAnimationState = direction === "next" ? "enterNext" : "enterBack";
    setAnimationState(enterState);

    const timer = setTimeout(
      () => {
        setAnimationState("idle");
      },
      reducedMotion ? Math.min(enterMs, durations.fast) : enterMs,
    );

    return () => clearTimeout(timer);
  }, [step, stepIndex, explicitDirection, enterMs, reducedMotion]);

  return {
    displayedStep,
    animationState,
    isTransitioning: animationState !== "idle",
  };
}
