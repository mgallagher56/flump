import { useContext, useEffect } from "react";
import { UNSAFE_DataRouterStateContext, useLocation } from "react-router";

/** How long after Back or Forward the saved place is held while the page grows (P80, P13). */
const RESTORE_HOLD_MS = 2000;

/** Any of these means the reader has taken over, so the saved place stops being held. */
const USER_INPUT_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Back and Forward put the page at its saved place (`<ScrollRestoration>`), but they do it the
 * moment the page first renders. A page whose charts or client-only parts take their size a moment
 * later (Mortgage) is still shorter than the saved offset then, so the browser clamps it and the
 * reader lands near the top. This holds the saved place while the page grows: each time the page
 * changes size within `RESTORE_HOLD_MS`, it scrolls back to the saved offset, and it lets go as
 * soon as the reader scrolls, taps or types, or opens another page.
 * Known limit: a page that scrolls itself within the hold after Back, with no input from the reader,
 * is pulled back to the saved place the next time it changes size.
 */
export function useScrollRestoreAfterGrowth(holdMs = RESTORE_HOLD_MS): void {
  const location = useLocation();
  const restoreScrollPosition = useContext(UNSAFE_DataRouterStateContext)?.restoreScrollPosition;

  // A new location (Back or Forward) starts a new hold.
  useEffect(() => {
    if (typeof restoreScrollPosition !== "number") return;
    const target = restoreScrollPosition;
    const hold = () => {
      if (Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
    };
    hold();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(hold);
    observer?.observe(document.body);
    const timer = window.setTimeout(stop, holdMs);
    for (const type of USER_INPUT_EVENTS) {
      window.addEventListener(type, stop, { passive: true, capture: true });
    }

    function stop() {
      observer?.disconnect();
      window.clearTimeout(timer);
      for (const type of USER_INPUT_EVENTS) {
        window.removeEventListener(type, stop, { capture: true });
      }
    }
    return stop;
  }, [location, restoreScrollPosition, holdMs]);
}
