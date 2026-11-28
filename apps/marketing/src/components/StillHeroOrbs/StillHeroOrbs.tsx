import type { FC } from "react";
import { GlassOrb, type OrbTone } from "../GlassOrb";
import { orbPlace, stillStage } from "./StillHeroOrbs.styles";

/** The hero's four orb colours, biggest first (the approved prototypes' order). */
export type HeroOrbTones = readonly [OrbTone, OrbTone, OrbTone, OrbTone];

const SLOTS = [0, 1, 2, 3] as const;

/**
 * The hero's four glass orbs in their places (the approved prototypes' `heroLayout`): beside the
 * copy from 48rem, on the shelf under the copy on phones. Put them in a size container: the live
 * stage (`HeroOrbs`) or the still one (`StillHeroOrbs`).
 */
export const HeroOrbSet: FC<{ tones: HeroOrbTones }> = ({ tones }) => (
  <>
    {SLOTS.map((slot) => (
      <span className={orbPlace({ slot })} data-hero-orb={slot} key={slot}>
        <GlassOrb tone={tones[slot]} />
      </span>
    ))}
  </>
);

export interface StillHeroOrbsProps {
  tones: HeroOrbTones;
}

/**
 * The first band's orbs at scene level S0 (the approved pricing, preview, security and contact
 * prototypes): the same four glass orbs as the hero scene's still, and nothing more. No script is
 * reachable from here, so three.js can never load on these pages (OTHER-PAGES-PLAN section 4).
 * Decoration only, behind the band's content and hidden from assistive technology. Put it first
 * inside a positioned band.
 */
export const StillHeroOrbs: FC<StillHeroOrbsProps> = ({ tones }) => (
  <span aria-hidden="true" className={stillStage} data-scene="still" data-testid="hero-stage">
    <HeroOrbSet tones={tones} />
  </span>
);
