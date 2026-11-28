import { useCallback, useSyncExternalStore } from "react";
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY } from "./motionScript";

const SYSTEM_QUERY = "(prefers-reduced-motion: reduce)";

export interface MotionPreference {
  /** The operating system asks for reduced motion. It wins: the choice below cannot undo it. */
  readonly system: boolean;
  /** The visitor pressed "Reduce motion" in the header (this visit or an earlier one). */
  readonly chosen: boolean;
  /** Turns the visitor's choice on or off, for this page at once and for later visits. */
  readonly setChosen: (on: boolean) => void;
}

const root = () => document.documentElement;

function subscribeChosen(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributeFilter: [MOTION_ATTRIBUTE] });
  return () => observer.disconnect();
}

const readChosen = () => root().getAttribute(MOTION_ATTRIBUTE) === "reduce";

function systemQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === "function" ? window.matchMedia(SYSTEM_QUERY) : undefined;
}

function subscribeSystem(onChange: () => void): () => void {
  const query = systemQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

const readSystem = () => systemQuery()?.matches ?? false;

// The server knows neither, so it renders the toggle off; the toggle's look follows the attribute
// and the media query in CSS, so nothing changes on screen when the page hydrates.
const offOnServer = () => false;

/**
 * The header's "Reduce motion" choice (UX-GUIDELINES MK14). It lives on `<html>` as
 * `data-motion="reduce"`, which the pre-paint script sets from storage (`MOTION_INIT_SCRIPT`), the
 * CSS motion conditions read and `usePrefersReducedMotion` in `@repo/ui` folds into reduced motion,
 * so the choice and the system setting feed the one reduced-motion state. Storage is wrapped in
 * try/catch, as the theme's is: a blocked store keeps the choice for this page only. No cookie.
 */
export function useMotionPreference(): MotionPreference {
  const chosen = useSyncExternalStore(subscribeChosen, readChosen, offOnServer);
  const system = useSyncExternalStore(subscribeSystem, readSystem, offOnServer);
  const setChosen = useCallback((on: boolean) => {
    if (on) root().setAttribute(MOTION_ATTRIBUTE, "reduce");
    else root().removeAttribute(MOTION_ATTRIBUTE);
    try {
      if (on) localStorage.setItem(MOTION_STORAGE_KEY, "reduce");
      else localStorage.removeItem(MOTION_STORAGE_KEY);
    } catch {
      // Storage blocked (a private window, a strict setting): the choice holds for this page.
    }
  }, []);
  return { system, chosen, setChosen };
}
