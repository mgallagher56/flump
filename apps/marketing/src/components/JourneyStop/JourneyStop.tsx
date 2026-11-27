import { Card } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { SAMPLE_MOMENTS, seconds } from "../../motion/journey/sampleMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { JourneySample } from "../JourneySample";
import {
  fact,
  lead,
  link,
  marker,
  name,
  pair,
  panel,
  side,
  stopItem,
  title,
} from "./JourneyStop.styles";
import { type JourneyStopCopy, journeyStopId } from "./journeyStops";

export interface JourneyStopProps {
  stop: JourneyStopCopy;
  /** Its place in the journey, from 0: the sample swaps sides at every stop. */
  index: number;
}

/** Where on the screen a stop's top must reach to trigger its arrival. */
const TRIGGER = 0.85;

/**
 * One stop of the journey, ported from prototype 11's `stops/JourneyStop.tsx`: the stop's name,
 * title, lead, one fact and a link, beside its sample.
 *
 * The server render is the finished stop, in reading order (MK1). With motion allowed, scroll
 * triggers its arrival once and time completes it (MK2): the pair rises a little and fades in,
 * then the sample plays its own moment, on one GSAP timeline that is never scrubbed. When it ends
 * every transform is cleared, so nothing holds a transform while the stop is read (MK3). A stop
 * already on screen when GSAP arrives stays as it is. With reduced motion GSAP never loads.
 */
export const JourneyStop: FC<JourneyStopProps> = ({ stop, index }) => {
  const ref = useRef<HTMLLIElement>(null);
  const id = journeyStopId(stop.key);
  const titleId = `${id}-title`;

  useGsapMoment(
    ref,
    (kit, root) => {
      // Already reached: leave it finished rather than hide and replay what is being read.
      if (root.getBoundingClientRect().top < window.innerHeight * TRIGGER) return undefined;
      const { gsap, ScrollTrigger } = kit;
      const sides = Array.from(root.querySelectorAll("[data-stop-side]"));
      const sampleRoot = root.querySelector<HTMLElement>("[data-sample]");
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        sides,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: seconds("entry"),
          ease: "calm",
          stagger: seconds("stagger"),
        },
        0,
      );
      const moment = sampleRoot ? SAMPLE_MOMENTS[sampleRoot.dataset.sample ?? ""] : undefined;
      const moved = sampleRoot && moment ? moment(kit, tl, sampleRoot, seconds("disclosure")) : [];
      // At rest nothing carries a transform or an inline opacity (MK3).
      tl.eventCallback("onComplete", () => {
        gsap.set([...sides, ...moved], { clearProps: "transform,opacity" });
      });
      ScrollTrigger.create({
        trigger: root,
        start: `top ${TRIGGER * 100}%`,
        once: true,
        onEnter: () => {
          tl.play();
        },
      });
      return undefined;
    },
    [stop.key],
  );

  return (
    <li className={stopItem} data-journey-stop="" data-stop-key={stop.key} ref={ref}>
      <article
        aria-labelledby={titleId}
        className={pair({ sampleSide: index % 2 === 0 ? "right" : "left" })}
        id={id}
      >
        <div className={side} data-stop-side="text">
          <Card className={panel} material="glass" padding="lg">
            <p className={name}>
              <span aria-hidden="true" className={marker} data-stop-marker="" />
              {stop.name}
            </p>
            <h3 className={title} id={titleId}>
              {stop.title}
            </h3>
            <p className={lead}>{stop.lead}</p>
            <p className={fact}>{stop.fact}</p>
            <Link className={link} to={stop.link.to}>
              {stop.link.label}
            </Link>
          </Card>
        </div>
        <div className={side} data-stop-side="sample">
          <JourneySample stop={stop.key} />
        </div>
      </article>
    </li>
  );
};
