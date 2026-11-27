import { type FC, useRef } from "react";
import { JourneyOrb } from "../JourneyOrb";
import { JourneyStop } from "../JourneyStop";
import { JOURNEY_STOPS } from "../JourneyStop/journeyStops";
import { MarketingSection } from "../MarketingSection";
import { MotionControl } from "../MotionControl";
import { introControl, journey, stopList } from "./HomeJourney.styles";

const ORB_TONES = JOURNEY_STOPS.map((stop) => stop.orbTone);

/**
 * The journey (ROLLOUT-PLAN M1 and M2, from prototype 11): six stops, the five areas and then the
 * picture they make, with the lit orb rolling down its bead track in the rail beside them.
 *
 * Without JavaScript, and with reduced motion, it is a plain vertical list of the six stops in
 * reading order with every stop's text and sample in the HTML, beside a still orb (MK1). With
 * motion, each stop arrives once as scroll reaches it and time completes it (MK2); at rest only the
 * orb moves (MK3). The orb pauses with the control in the intro (MK14).
 */
export const HomeJourney: FC = () => {
  const journeyRef = useRef<HTMLDivElement>(null);
  return (
    <MarketingSection
      data-testid="home-journey"
      id="journey"
      subtitle="Five areas, one at a time: what you have, what comes in and goes out, your pay, what you put by and what you owe. Then the picture they make."
      title="From rough figures to one picture"
      tone="canvas"
    >
      <div className={introControl}>
        <MotionControl />
      </div>
      <div className={journey} data-journey="" ref={journeyRef}>
        <JourneyOrb journeyRef={journeyRef} tones={ORB_TONES} />
        <ol className={stopList}>
          {JOURNEY_STOPS.map((stop, index) => (
            <JourneyStop index={index} key={stop.key} stop={stop} />
          ))}
        </ol>
      </div>
    </MarketingSection>
  );
};
