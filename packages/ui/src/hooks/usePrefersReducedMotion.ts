import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMediaQueryList(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  return window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const mql = getMediaQueryList();
  if (!mql) return () => {};
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return getMediaQueryList()?.matches ?? false;
}

// The server (and any environment without matchMedia) assumes motion is allowed.
function getServerSnapshot(): boolean {
  return false;
}

/** True when the operating system asks for reduced motion. Updates live when the setting changes. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
