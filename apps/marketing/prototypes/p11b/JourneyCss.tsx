import { type FC, type RefObject, useRef } from "react";
import { GlassOrb } from "../p11/art/GlassOrb";
import type { JourneyProps } from "../p11/journeyTypes";
import { JourneyShell } from "../p11/stops/JourneyStop";
import { usePace } from "../shared/pace";
import { useGsap } from "../shared/useGsap";
import { type Orb, startTravel } from "./travel";
import "./journey.css";

/**
 * Prototype 11b's journey: prototype 11's stops (its JourneyShell and JourneyStop, unchanged), with
 * the travelling layer built from GSAP, SVG and CSS depth only (no WebGL). A sticky stage behind
 * the stops holds the route and four glass orbs, one from each bubble colour (sky, teal, violet,
 * rose). While a stop's pair rests, only the orbs move: they run down the outer side of the
 * information component (along the free lane on phones), then cross to the next stop's side while
 * the two pairs change over.
 *
 * Before scripts and with reduced motion the stage is not shown and the stops are the still page.
 */

/** The lead orb first, then its companions and how far behind each runs (px of route). */
const ORBS: {
  tone: "teal" | "sky" | "violet" | "rose";
  size: "lead" | "mid" | "small";
  lag: number;
}[] = [
  { tone: "sky", size: "lead", lag: 0 },
  { tone: "violet", size: "mid", lag: 86 },
  { tone: "teal", size: "small", lag: 150 },
  { tone: "rose", size: "small", lag: 200 },
];

const Stage: FC<{
  stageRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
}> = ({ stageRef, svgRef }) => (
  <div aria-hidden="true" className="p11b-stage" ref={stageRef}>
    <svg className="p11b-stage__routes" ref={svgRef} />
    {ORBS.map((orb) => (
      <span
        className="p11b-orb"
        data-orb=""
        data-size={orb.size}
        data-tone={orb.tone}
        key={orb.tone}
      >
        {orb.size === "lead" && <span className="p11b-orb__glow" />}
        <GlassOrb tone={orb.tone} />
      </span>
    ))}
  </div>
);

export const JourneyCss: FC<JourneyProps> = ({ stops, intro }) => {
  const journeyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pace = usePace();

  useGsap(
    journeyRef,
    (kit, journey) => {
      const stage = stageRef.current;
      const svg = svgRef.current;
      if (!stage || !svg) return;
      const orbs: Orb[] = Array.from(stage.querySelectorAll<HTMLElement>("[data-orb]")).map(
        (element, i) => ({ element, lag: ORBS[i]?.lag ?? 0, lead: i === 0 }),
      );
      const stopEls = Array.from(journey.querySelectorAll<HTMLElement>("[data-journey-stop]"));
      return startTravel(kit, journey, { stage, svg, orbs, stops: stopEls });
    },
    [pace.pace, stops.length],
  );

  return (
    <JourneyShell
      className="p11b-journey"
      intro={intro}
      journeyRef={journeyRef}
      layer={<Stage stageRef={stageRef} svgRef={svgRef} />}
      scene="css"
      stops={stops}
    />
  );
};
