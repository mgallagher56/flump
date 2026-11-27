import { afterFirstPaint } from "../loadGsapKit";

/** The hero orb scene module, once loaded. */
export type HeroOrbSceneModule = typeof import("./heroOrbScene");

let scene: Promise<HeroOrbSceneModule> | undefined;

/**
 * The hero's three.js scene, loaded once after first paint by dynamic import, so three.js is never
 * in the first download (MK12). Callers check `useScenePower()` first (through `SceneStage`): it
 * is `still` under reduced motion, on a weak device and without WebGL, so then this is never
 * called and three.js never downloads.
 */
export function loadHeroOrbScene(): Promise<HeroOrbSceneModule> {
  scene ??= afterFirstPaint()
    .then(() => import("./heroOrbScene"))
    .catch((error: unknown) => {
      // A failed download may be retried on the next page; the still stays meanwhile.
      scene = undefined;
      throw error;
    });
  return scene;
}
