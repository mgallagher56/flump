import { type FC, useRef } from "react";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { ALL_FEATURE_LINES, START_HERE } from "../../utils/featureIndex";
import { openFeatureLine } from "../FeatureIndex";
import { MarketingBand } from "../MarketingBand";
import { SoftCard } from "../SoftCard";
import { TiltLight } from "../TiltLight";
import { band, goal, goalCard, goalItem, goalLink, goalLinks, goalList } from "./StartHere.styles";

const nameOf = (id: string): string => {
  const line = ALL_FEATURE_LINES.find((candidate) => candidate.id === id);
  if (!line) throw new Error(`START_HERE names an unknown line: ${id}`);
  return line.name;
};

const goalsArrive = arriveMoment("[data-arrive-item]", 16);

/**
 * "Start here" (the approved features prototype): a few goals in plain words, each a glass card
 * with links to the lines on the page it involves. A link only changes the hash, so the index opens
 * and scrolls to that line. The cards arrive in turn when the band comes into view.
 */
export const StartHere: FC = () => {
  const ref = useRef<HTMLElement>(null);
  useGsapMoment(ref, goalsArrive);
  return (
    <MarketingBand bubbles="a" className={band} id="start-here" title="Start here" tone="card">
      <nav aria-labelledby="start-here-title" ref={ref}>
        <ul className={goalList}>
          {START_HERE.map((entry) => (
            <TiltLight as="li" className={goalItem} data-arrive-item="" key={entry.goal}>
              <SoftCard className={goalCard} radius="tray">
                <p className={goal}>{entry.goal}</p>
                <ul aria-label={entry.goal} className={goalLinks}>
                  {entry.lines.map((id) => (
                    <li key={id}>
                      <a
                        className={goalLink}
                        href={`#${id}`}
                        onClick={() => {
                          // The same hash again fires no hashchange, so open the line here.
                          if (window.location.hash === `#${id}`) openFeatureLine(id);
                        }}
                      >
                        {nameOf(id)}
                      </a>
                    </li>
                  ))}
                </ul>
              </SoftCard>
            </TiltLight>
          ))}
        </ul>
      </nav>
    </MarketingBand>
  );
};
