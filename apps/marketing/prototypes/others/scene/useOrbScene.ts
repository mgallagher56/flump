import { type RefObject, useEffect, useRef, useState } from "react";
import { useMotion, useThemeVersion } from "../../shared/motion";
import { usePace } from "../../shared/pace";
import { stillReason } from "../../shared/useLazyScene";
import type { OrbLayout } from "./orbScene";
import { useScene } from "./sceneLevel";

export type OrbSceneState = "still" | "loading" | "live";

/**
 * Loads the orb scene after first paint, when the browser is idle, unless motion is reduced or the
 * device looks too weak (shared `stillReason`). Mount it only at the levels that use it (S1, S2):
 * unmounting disposes the scene. The pause control stops it in place; a theme change recolours it.
 */
export function useOrbScene(
  container: RefObject<HTMLElement | null>,
  layout: OrbLayout,
  backdropToken: string,
): { state: OrbSceneState; reason: string } {
  const { reduced } = useMotion();
  const { paused } = useScene();
  const pace = usePace();
  const themeVersion = useThemeVersion();
  const factor = useRef(pace.factor);
  factor.current = pace.factor;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const handle = useRef<Awaited<ReturnType<typeof import("./orbScene")["createOrbScene"]>> | null>(
    null,
  );
  const [state, setState] = useState<OrbSceneState>("still");
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
      import("./orbScene").then(({ createOrbScene }) => {
        if (cancelled) return;
        handle.current = createOrbScene({
          container: element,
          layout: (w, h) => layoutRef.current(w, h),
          backdropToken,
          running: !pausedRef.current,
          getPace: () => factor.current,
          onFallback: fallback,
        });
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
  }, [reduced, backdropToken]);

  useEffect(() => {
    handle.current?.setRunning(!paused);
  }, [paused]);

  useEffect(() => {
    if (themeVersion > 0) handle.current?.refreshColours?.();
  }, [themeVersion]);

  return { state, reason };
}
