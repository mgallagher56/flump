import { type FC, type ReactNode, useEffect, useRef } from "react";
import { cx } from "../../../styled-system/css";
import { useDelayedPending } from "../../hooks/useDelayedPending";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { pendingRevealRecipe } from "./PendingReveal.styles";

export interface PendingRevealProps {
  /** True while the content is loading. */
  pending: boolean;
  /**
   * The placeholder, usually `Skeleton`s laid out at the size of the content they stand for, so
   * nothing moves when the content arrives.
   */
  fallback: ReactNode;
  /** The loaded content. Rendered only when not pending. */
  children: ReactNode;
  className?: string;
}

/**
 * The one way to show a loading placeholder (UX-GUIDELINES "Loading"). During the first
 * `durations.pendingDelay` (200ms) of a wait the placeholder is laid out but invisible, so the space
 * is held and a fast load shows nothing. After that it shows for at least `durations.pendingMinimum`
 * (400ms), so it never blinks. Content that replaces a shown placeholder fades in over
 * `durations.reveal` (150ms); content that arrives before the placeholder shows appears at once.
 * Under reduced motion nothing fades or pulses.
 */
export const PendingReveal: FC<PendingRevealProps> = ({
  pending,
  fallback,
  children,
  className,
}) => {
  const placeholderShown = useDelayedPending(pending);
  const reducedMotion = usePrefersReducedMotion();
  // Whether the placeholder was on screen during this wait, so only a real swap fades in.
  const wasShown = useRef(false);
  useEffect(() => {
    if (placeholderShown) wasShown.current = true;
    else if (pending) wasShown.current = false;
  }, [placeholderShown, pending]);

  if (pending || placeholderShown) {
    return (
      <div
        aria-busy="true"
        className={cx(
          pendingRevealRecipe({ state: placeholderShown ? "shown" : "held" }),
          className,
        )}
        data-pending-state={placeholderShown ? "shown" : "held"}
        data-testid="pending-reveal-fallback"
      >
        {fallback}
      </div>
    );
  }

  const fade = wasShown.current && !reducedMotion;
  return (
    <div
      className={cx(pendingRevealRecipe({ state: fade ? "reveal" : "ready" }), className)}
      data-pending-state={fade ? "reveal" : "ready"}
    >
      {children}
    </div>
  );
};

export default PendingReveal;
