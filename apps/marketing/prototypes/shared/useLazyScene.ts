import { type RefObject, useEffect, useRef, useState } from "react";
import { useMotion, useThemeVersion } from "./motion";

/** What a scene module returns: a way to follow a theme change, and a way to clean up. */
export interface SceneHandle {
  refreshColours?: () => void;
  dispose: () => void;
}

export type SceneState = "still" | "loading" | "live";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Why the still image shows instead of a 3D scene, or null when the scene may load. */
export function stillReason(): string | null {
  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return "Data saver is on";
  if ((nav.deviceMemory ?? 8) < 4) return "Low device memory";
  if ((nav.hardwareConcurrency ?? 8) < 4) return "Few processor cores";
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!gl) return "No WebGL";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return null;
}

/**
 * Loads a three.js scene after first paint, when the browser is idle, unless motion is reduced or
 * the device looks too weak (`stillReason`). `load` must import the scene module dynamically, so
 * three.js stays out of the first download, and returns its handle. The scene can give up later
 * through `fallback(reason)`. While the state is not "live", the page shows its still version.
 */
export function useLazyScene(
  container: RefObject<HTMLElement | null>,
  load: (container: HTMLElement, fallback: (reason: string) => void) => Promise<SceneHandle>,
): { state: SceneState; reason: string } {
  const { reduced } = useMotion();
  const themeVersion = useThemeVersion();
  const handle = useRef<SceneHandle | null>(null);
  const [state, setState] = useState<SceneState>("still");
  const [reason, setReason] = useState("Waiting for first paint");
  useEffect(() => {
    if (reduced) {
      setReason("Reduced motion");
      return;
    }
    const why = stillReason();
    if (why) {
      setReason(why);
      return;
    }
    let cancelled = false;
    const fallback = (why: string) => {
      setReason(why);
      setState("still");
      handle.current?.dispose();
      handle.current = null;
    };
    const start = () => {
      const element = container.current;
      if (cancelled || !element) return;
      setState("loading");
      load(element, fallback).then((h) => {
        if (cancelled) {
          h.dispose();
          return;
        }
        handle.current = h;
        setState("live");
      });
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const afterLoad = () => idle(start, { timeout: 1500 });
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterLoad);
      handle.current?.dispose();
      handle.current = null;
      setState("still");
    };
  }, [reduced]);

  useEffect(() => {
    if (themeVersion > 0) handle.current?.refreshColours?.();
  }, [themeVersion]);

  return { state, reason };
}
