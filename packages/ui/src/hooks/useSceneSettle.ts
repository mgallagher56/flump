import { useRef, useState } from "react";
import { useHydratingRender } from "./useHydratingRender";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const STORAGE_PREFIX = "flump.scene-settled.";

// In-memory fallback for environments without sessionStorage (SSR or storage disabled)
const memorySettled = new Set<string>();

export function isSceneSettled(key: string): boolean {
  if (memorySettled.has(key)) return true;
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + key) !== null;
  } catch {
    return false;
  }
}

export function markSceneSettled(key: string): void {
  memorySettled.add(key);
  if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + key, "1");
    } catch {
      // Ignored
    }
  }
}

export function clearSceneSettled(): void {
  memorySettled.clear();
  if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
      }
      for (const k of keysToRemove) window.sessionStorage.removeItem(k);
    } catch {
      // Ignored
    }
  }
}

/**
 * E17 Demo 7: Scene settling once on first view.
 * Returns true only the first time a scene is viewed during a visit/session.
 * Under `prefers-reduced-motion` or on subsequent views, returns false so the scene stays still.
 * On a server-rendered page the still scene is already painted, so the first view after hydration
 * stays still and is recorded as seen; the settle plays only when the scene mounts on the client.
 */
export function useSceneSettle(sceneKey: string = "default"): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const [shouldSettle, setShouldSettle] = useState(false);
  // The scene this instance claimed the settle for. A ref survives StrictMode's second effect run,
  // so the instance that marked the scene settled keeps playing it instead of seeing its own mark.
  const claimed = useRef<string | null>(null);
  // Read once: a hydrating first render keeps the server-painted still scene instead of replaying.
  const hydrating = useHydratingRender();
  const hydratedFromServer = useRef(hydrating);

  // A layout effect, so the settle starts before the first paint (no still frame, then a replay).
  useIsomorphicLayoutEffect(() => {
    if (hydratedFromServer.current) {
      hydratedFromServer.current = false;
      markSceneSettled(sceneKey);
      setShouldSettle(false);
      return;
    }

    if (reducedMotion) {
      setShouldSettle(false);
      return;
    }

    if (claimed.current === sceneKey) {
      setShouldSettle(true);
      return;
    }

    if (!isSceneSettled(sceneKey)) {
      markSceneSettled(sceneKey);
      claimed.current = sceneKey;
      setShouldSettle(true);
    } else {
      setShouldSettle(false);
    }
  }, [sceneKey, reducedMotion]);

  return shouldSettle;
}
