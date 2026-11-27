import { type FC, useRef } from "react";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { GROUP_TONES } from "../../utils/areaOrbTones";
import { MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";
import { GlassOrb } from "../GlassOrb";
import { MarketingBand } from "../MarketingBand";
import type { MarketingSectionTone } from "../MarketingSection";
import { pillHere, pillLink, pillOrb, pills } from "./AreaPills.styles";

export interface AreaPillsProps {
  /** The area this page is about, marked "You are here". None on the AI connection page. */
  current?: MoneyAreaKey;
  tone: MarketingSectionTone;
}

const pillsArrive = arriveMoment("[data-arrive-item]", 12);

/**
 * "Part of one picture" (the approved area and AI connection prototypes): the five areas as pills,
 * each with its area's orb, in production's words. The pills arrive in turn when the band comes
 * into view.
 */
export const AreaPills: FC<AreaPillsProps> = ({ current, tone }) => {
  const ref = useRef<HTMLUListElement>(null);
  useGsapMoment(ref, pillsArrive);
  return (
    <MarketingBand
      id="one-picture"
      subtitle="Use one area or all five. Together they make one picture of your money, on your Home page."
      title="Part of one picture"
      tone={tone}
    >
      <ul className={pills} data-testid="area-strip" ref={ref}>
        {MONEY_AREAS.map((area) => {
          const here = area.key === current;
          return (
            <li data-arrive-item="" key={area.key}>
              <a aria-current={here ? "page" : undefined} className={pillLink} href={area.path}>
                <GlassOrb className={pillOrb} tone={GROUP_TONES[area.key]} />
                <span>{area.name}</span>
                {here && <span className={pillHere}>You are here</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </MarketingBand>
  );
};
