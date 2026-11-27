import { type FC, type ReactNode, useRef } from "react";
import { HeroOrbs, type HeroOrbTones } from "../HeroOrbs";
import { LitCtas } from "../LitCtas";
import { MotionControl } from "../MotionControl";
import {
  hero,
  heroCopy,
  heroCtas,
  heroInner,
  heroLabel,
  heroLead,
  heroNote,
  heroPause,
  heroTitle,
} from "./PageHero.styles";

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
 * prototypes at `prototypes/others`): a small label, the h1, the lead, the calls to action with the
 * pointer light, and the orbs beside the copy, live at scene level S1. The scene is this page's only
 * ambient motion, so its pause control sits here, under the calls to action (MK14, WCAG 2.2.2).
 */
export const PageHero: FC<PageHeroProps> = ({
  titleId,
  label,
  title,
  lead,
  badge,
  note,
  previewHref,
  tones,
  children,
  "data-testid": testId,
}) => {
  const ref = useRef<HTMLElement>(null);
  return (
    <section aria-labelledby={titleId} className={hero} data-testid={testId} ref={ref}>
      <HeroOrbs tones={tones} watchRef={ref} />
      <div className={heroInner}>
        <div className={heroCopy}>
          {label && label !== title && <p className={heroLabel}>{label}</p>}
          <h1 className={heroTitle} id={titleId}>
            {title}
          </h1>
          <p className={heroLead}>{lead}</p>
          {badge}
          {note && <p className={heroNote}>{note}</p>}
          {children}
          <div className={heroCtas}>
            <LitCtas previewHref={previewHref} secondary={Boolean(previewHref)} />
          </div>
          <span className={heroPause}>
            <MotionControl />
          </span>
        </div>
      </div>
    </section>
  );
};
