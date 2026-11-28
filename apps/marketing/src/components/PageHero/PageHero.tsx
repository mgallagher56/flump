import { type FC, type ReactNode, useRef } from "react";
import { HeroBand } from "../HeroBand";
import { HeroOrbs, type HeroOrbTones } from "../HeroOrbs";
import { LitCtas } from "../LitCtas";
import { MotionControl } from "../MotionControl";
import { heroPause } from "./PageHero.styles";

export interface PageHeroProps {
  /** The h1's id; it labels the band. */
  titleId: string;
  /** A small label above the h1 (an area's name). Left out when it would repeat the title. */
  label?: string;
  title: string;
  lead: string;
  /** A small label under the lead (the AI connection's "Preview"). */
  badge?: ReactNode;
  /** One more line under the lead (and the badge). */
  note?: string;
  /** Where "Interactive preview" beside "Request an invite" goes; left out, no second button. */
  previewHref?: string;
  /** The four orb colours, biggest first. */
  tones: HeroOrbTones;
  children?: ReactNode;
  "data-testid"?: string;
}

/**
 * The first band of the features and area pages (OTHER-PAGES-PLAN slice P1, from the approved
 * prototypes at `prototypes/others`): `HeroBand` with the calls to action and the pointer light, and
 * the orbs beside the copy, live at scene level S1. The scene is this page's only ambient motion,
 * so its pause control sits here, under the calls to action (MK14, WCAG 2.2.2).
 */
export const PageHero: FC<PageHeroProps> = ({ previewHref, tones, ...band }) => {
  const ref = useRef<HTMLElement>(null);
  return (
    <HeroBand
      {...band}
      actions={<LitCtas previewHref={previewHref} secondary={Boolean(previewHref)} />}
      orbs={<HeroOrbs tones={tones} watchRef={ref} />}
      pause={
        <span className={heroPause}>
          <MotionControl />
        </span>
      }
      ref={ref}
    />
  );
};
