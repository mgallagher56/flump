import { afterFirstPaint } from "../loadGsapKit";

/** The three.js scene module, once loaded. */
export type JourneySceneModule = typeof import("./journeyScene");

let scene: Promise<JourneySceneModule> | undefined;

/**
 * The journey's three.js scene, loaded once after first paint by dynamic import, so three.js is
 * never in the first download (MK12). Callers check `useScenePower()` first: it is `still` under
 * reduced motion, on a weak device and without WebGL, so then this is never called and three.js
 * never downloads.
 */
export function loadJourneyScene(): Promise<JourneySceneModule> {
  scene ??= afterFirstPaint()
    .then(() => import("./journeyScene"))
    .catch((error: unknown) => {
      // A failed download may be retried on the next visit to the journey; the still stays meanwhile.
      scene = undefined;
      throw error;
    });
  return scene;
}
