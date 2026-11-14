import { useSyncExternalStore } from "react";

/** Below the `md` breakpoint (48rem, 768px): the phone layout. */
export const BELOW_MD_QUERY = "not all and (min-width: 48rem)";

function mediaQueryList(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  return window.matchMedia(BELOW_MD_QUERY);
}

function subscribe(onChange: () => void): () => void {
  const mql = mediaQueryList();
  if (!mql) return () => {};
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => mediaQueryList()?.matches ?? false;
// The server, and any environment without matchMedia, renders the wide layout.
const getServerSnapshot = () => false;

/**
 * True below `md`. The check-in switches between one card per account and one list with it, so
 * only one of the two layouts is ever mounted (no duplicate field ids).
 */
export function useBelowMd(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
