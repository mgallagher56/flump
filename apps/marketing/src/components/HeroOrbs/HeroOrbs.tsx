import { type FC, type RefObject, useCallback } from "react";
import { loadHeroOrbScene } from "../../motion/heroOrbs/loadHeroOrbScene";
import { SceneStage, type SceneStartContext } from "../SceneStage";
import { HeroOrbSet, type HeroOrbTones } from "../StillHeroOrbs";
import { canvasSwatch } from "./HeroOrbs.styles";

export type { HeroOrbTones };

export interface HeroOrbsProps {
  tones: HeroOrbTones;
  /** The hero band: the scene loads as it nears the viewport. */
  watchRef: RefObject<HTMLElement | null>;
}

/**
 * The first band's orbs (scene level S1, OTHER-PAGES-PLAN section 4, from the approved features
 * and area prototypes): four still glass orbs beside the copy, which become live three.js glass
 * floating in place once the power policy allows it (`SceneStage`, MK11, MK12). The still orbs are
 * the server render, the reduced-motion page and a weak device's page; the live scene draws the
 * same orbs in the same places. Decoration only, behind the band's content and hidden from
 * assistive technology. Put it first inside a positioned band.
 */
export const HeroOrbs: FC<HeroOrbsProps> = ({ tones, watchRef }) => {
  const start = useCallback(async (context: SceneStartContext) => {
    const { createHeroOrbScene } = await loadHeroOrbScene();
    return createHeroOrbScene(context);
  }, []);
  return (
    <SceneStage data-testid="hero-stage" fit="band" start={start} watchRef={watchRef}>
      <HeroOrbSet tones={tones} />
      <span className={canvasSwatch} data-scene-swatch="canvas" />
    </SceneStage>
  );
};
