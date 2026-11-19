import { useEffect, useLayoutEffect, useRef } from "react";
import { type Location, NavigationType, useLocation, useNavigationType } from "react-router-dom";

/** sessionStorage key for the scroll position of each history entry, so back works after a reload. */
export const SCROLL_STORAGE_KEY = "flump-marketing-scroll";

/** `id` of every page's `<main>` (the skip link target); focus moves here on a new page. */
const MAIN_ID = "main";

// useLayoutEffect warns during server rendering; the server never scrolls, so a no-op is right.
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Positions = Record<string, number>;

function readPositions(): Positions {
  try {
    const stored = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Positions) : {};
  } catch {
    return {};
  }
}

function writePositions(positions: Positions): void {
  try {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage can be full or blocked (private mode); back then starts at the top instead.
  }
}

function hashTarget(hash: string): HTMLElement | null {
  if (!hash || hash === "#") return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * The key a position is saved under. `BrowserRouter` gives every entry made by a full page load or a
 * native `#` jump the same key, "default" (a typed URL, a link from email, the skip link), so those
 * are told apart by their URL; otherwise one page's offset would open another page. Exported for
 * the tests.
 */
export function positionKey(
  location: Pick<Location, "key" | "pathname" | "search" | "hash">,
): string {
  return location.key === "default"
    ? `default:${location.pathname}${location.search}${location.hash}`
    : location.key;
}

/** The first load is a reload or back/forward (restore), not a fresh visit (leave at the top). */
export function isReturnVisit(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry?.type === "reload" || entry?.type === "back_forward";
  } catch {
    return false;
  }
}

/**
 * What to do with the scroll position after the router shows `location`. Exported for the tests.
 * - A link to an anchor (or the skip link): scroll its target into view; its `scroll-margin-top`
 *   clears the header. This comes first, so a saved offset never overrides an anchor.
 * - Back or forward to an entry we saw: return to where the reader left it.
 * - Any other new page: the top, with focus on `<main>` for keyboard and screen-reader users.
 */
export function applyScroll(
  location: Pick<Location, "key" | "pathname" | "search" | "hash">,
  navigationType: NavigationType,
  positions: Positions,
): void {
  const target = hashTarget(location.hash);
  if (target) {
    target.scrollIntoView({ block: "start" });
    return;
  }
  if (navigationType === NavigationType.Pop) {
    const saved = positions[positionKey(location)];
    if (saved !== undefined) {
      window.scrollTo(0, saved);
      return;
    }
  }
  window.scrollTo(0, 0);
  if (navigationType !== NavigationType.Pop)
    document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
}

/**
 * Scroll restoration for the marketing site's `BrowserRouter`, which (unlike a data router) has no
 * `<ScrollRestoration>`: without this a new page kept the old page's scroll position, so it opened
 * part way down. Renders nothing. On the first load it restores only a reload or a back/forward
 * visit to an entry it saved; a fresh visit is left where the browser puts it (the top or the
 * anchor).
 */
export function ScrollManager(): null {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Positions>({});
  const currentKey = useRef(positionKey(location));
  const firstRender = useRef(true);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Keep the position of the entry on screen up to date. Saved as the reader scrolls (once a
  // frame), because by the time the next page has rendered the old position is gone.
  useEffect(() => {
    let frame = 0;
    const save = () => {
      positions.current[currentKey.current] = window.scrollY;
      writePositions(positions.current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        save();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, []);

  const { key, pathname, search, hash } = location;
  // The path, query, hash and navigation type only ever change together with the key, or with a
  // native `#` jump that keeps the key "default".
  useClientLayoutEffect(() => {
    const current = { key, pathname, search, hash };
    currentKey.current = positionKey(current);
    if (firstRender.current) {
      firstRender.current = false;
      positions.current = readPositions();
      const saved = positions.current[currentKey.current];
      // History is manual from here on, so the browser no longer restores a reload itself.
      if (isReturnVisit() && !hash && saved !== undefined) window.scrollTo(0, saved);
      return;
    }
    applyScroll(current, navigationType, positions.current);
  }, [key, pathname, search, hash, navigationType]);

  return null;
}
