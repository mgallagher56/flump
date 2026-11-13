import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";

export interface UnsavedChangesGuard {
  /** True while the discard dialog should be showing. */
  blocked: boolean;
  /** Runs `action` now when nothing is unsaved; otherwise holds it and raises the dialog. */
  guard: (action: () => void) => void;
  /** Discard the changes and carry on with whatever was held (a tab change or a navigation). */
  proceed: () => void;
  /** Keep editing: drop whatever was held. */
  stay: () => void;
}

interface BlockerLike {
  state: "unblocked" | "blocked" | "proceeding";
  proceed?: () => void;
  reset?: () => void;
}

const NO_BLOCKER: BlockerLike = { state: "unblocked" };

/**
 * Unsaved-changes guard (E15 plan I-14). While `dirty`, leaving the page through the router is
 * blocked with `useBlocker` and a browser refresh or close shows the native prompt. In-page
 * changes (switching settings tab) go through `guard()` so they share one confirmation dialog.
 * Outside a data router (unit tests, stories) the router part is skipped.
 */
export const useUnsavedChangesGuard = (dirty: boolean): UnsavedChangesGuard => {
  let blocker: BlockerLike = NO_BLOCKER;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: useBlocker throws outside a data router; that never changes for a mounted instance
    blocker = useBlocker(
      ({ currentLocation, nextLocation }) =>
        dirty && currentLocation.pathname !== nextLocation.pathname,
    ) as BlockerLike;
  } catch {
    blocker = NO_BLOCKER;
  }

  const [held, setHeld] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const guard = useCallback((action: () => void) => {
    if (dirtyRef.current) setHeld(() => action);
    else action();
  }, []);

  const proceed = useCallback(() => {
    if (held) {
      held();
      setHeld(null);
    }
    if (blocker.state === "blocked") blocker.proceed?.();
  }, [held, blocker]);

  const stay = useCallback(() => {
    setHeld(null);
    if (blocker.state === "blocked") blocker.reset?.();
  }, [blocker]);

  return { blocked: held !== null || blocker.state === "blocked", guard, proceed, stay };
};
