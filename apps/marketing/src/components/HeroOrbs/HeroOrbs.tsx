import { type FC, type RefObject, useCallback } from "react";
import { loadHeroOrbScene } from "../../motion/heroOrbs/loadHeroOrbScene";
import { GlassOrb, type OrbTone } from "../GlassOrb";
import { SceneStage, type SceneStartContext } from "../SceneStage";
import { canvasSwatch, orbPlace } from "./HeroOrbs.styles";

/** The hero's four orb colours, biggest first (the approved prototypes' order). */
export type HeroOrbTones = readonly [OrbTone, OrbTone, OrbTone, OrbTone];

export interface HeroOrbsProps {
  tones: HeroOrbTones;
  /** The hero band: the scene loads as it nears the viewport. */
  watchRef: RefObject<HTMLElement | null>;
}

const SLOTS = [0, 1, 2, 3] as const;

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
      {SLOTS.map((slot) => (
        <span className={orbPlace({ slot })} data-hero-orb={slot} key={slot}>
          <GlassOrb tone={tones[slot]} />
        </span>
      ))}
      <span className={canvasSwatch} data-scene-swatch="canvas" />
    </SceneStage>
  );
};
