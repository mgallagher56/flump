import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Set to `reduce` on `<html>` when the visitor has chosen to reduce motion on the page itself. Only
 * the marketing site sets it (its header's "Reduce motion" button and pre-paint script); the web
 * app never does, so there this hook follows the operating system alone.
 */
export const REDUCE_MOTION_ATTRIBUTE = "data-motion";

function getMediaQueryList(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  return window.matchMedia(QUERY);
}

function chosenOnPage(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(REDUCE_MOTION_ATTRIBUTE) === "reduce";
}

function subscribe(onChange: () => void): () => void {
  const mql = getMediaQueryList();
  mql?.addEventListener("change", onChange);
  const observer =
    typeof MutationObserver === "undefined" || typeof document === "undefined"
      ? undefined
      : new MutationObserver(onChange);
  observer?.observe(document.documentElement, { attributeFilter: [REDUCE_MOTION_ATTRIBUTE] });
  return () => {
    mql?.removeEventListener("change", onChange);
    observer?.disconnect();
  };
}

/** True when the operating system asks for reduced motion, or the page's own choice does. */
export function isReducedMotion(): boolean {
  return (getMediaQueryList()?.matches ?? false) || chosenOnPage();
}

// The server (and any environment without matchMedia) assumes motion is allowed.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the operating system asks for reduced motion, or the page has been set to reduce it
 * (`REDUCE_MOTION_ATTRIBUTE`). Updates live when either changes.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, isReducedMotion, getServerSnapshot);
}
