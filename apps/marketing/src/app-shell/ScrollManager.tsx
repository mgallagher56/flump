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
 * What to do with the scroll position after the router shows `location`. Exported for the tests.
 * - Back or forward to an entry we saw: return to where the reader left it.
 * - A link to an anchor: scroll its target into view (its `scroll-margin-top` clears the header).
 * - Any other new page: the top, with focus on `<main>` for keyboard and screen-reader users.
 */
export function applyScroll(
  location: Pick<Location, "key" | "hash">,
  navigationType: NavigationType,
  positions: Positions,
): void {
  if (navigationType === NavigationType.Pop) {
    const saved = positions[location.key];
    if (saved !== undefined) {
      window.scrollTo(0, saved);
      return;
    }
  }
  const target = hashTarget(location.hash);
  if (target) {
    target.scrollIntoView({ block: "start" });
    return;
  }
  window.scrollTo(0, 0);
  if (navigationType !== NavigationType.Pop)
    document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
}

/**
 * Scroll restoration for the marketing site's `BrowserRouter`, which (unlike a data router) has no
 * `<ScrollRestoration>`: without this a new page kept the old page's scroll position, so it opened
 * part way down. Renders nothing. The first page load is left to the browser.
 */
export function ScrollManager(): null {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Positions>({});
  const currentKey = useRef(location.key);
  const firstRender = useRef(true);

  useEffect(() => {
    positions.current = readPositions();
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

  const { key, hash } = location;
  // The hash and navigation type only ever change together with the key.
  useClientLayoutEffect(() => {
    currentKey.current = key;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    applyScroll({ key, hash }, navigationType, positions.current);
  }, [key, hash, navigationType]);

  return null;
}
