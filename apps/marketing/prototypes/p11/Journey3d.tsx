import { type FC, useRef } from "react";
import { usePace } from "../shared/pace";
import { useLazyScene } from "../shared/useLazyScene";
import { GlassOrb } from "./art/GlassOrb";
import type { JourneyProps } from "./journeyTypes";
import { JourneyShell } from "./stops/JourneyStop";
import "./journey3d.css";

/**
 * Prototype 11's journey: the shared stops (JourneyShell) over a three.js travelling layer. The
 * layer is sticky inside the journey, renders only while the journey is on screen, and keeps the
 * orb moving through every stop's rest. Until the scene is live (and on a weak device, or with
 * reduced motion) the layer shows a still: a few CSS glass orbs at the edges.
 */
export const Journey3d: FC<JourneyProps> = ({ stops, intro }) => {
  const journeyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pace = usePace();
  const factor = useRef(pace.factor);
  factor.current = pace.factor;
  const { state, reason } = useLazyScene(stageRef, async (container, fallback) => {
    const { createJourneyScene } = await import("./journeyScene");
    const journey = journeyRef.current;
    if (!journey) throw new Error("No journey");
    return createJourneyScene({
      container,
      journey,
      onFallback: fallback,
      getPace: () => factor.current,
    });
  });

  return (
    <JourneyShell
      className="p11-journey--3d"
      intro={intro}
      journeyRef={journeyRef}
      layer={
        <div aria-hidden="true" className="p11-jstage" ref={stageRef}>
          <div className="p11-jstage__still">
            <GlassOrb className="p11-still-orb p11-still-orb--1" tone="sky" />
            <GlassOrb className="p11-still-orb p11-still-orb--2" tone="violet" />
            <GlassOrb className="p11-still-orb p11-still-orb--3" tone="teal" />
            <GlassOrb className="p11-still-orb p11-still-orb--4" tone="rose" />
          </div>
        </div>
      }
      scene={state}
      stops={stops}
    >
      {/* For tests and screen readers only: which version of the scene is showing. */}
      <p className="p11-scene-note p11-sr" data-testid="p11-scene-note">
        Scene: {state === "live" ? "3D" : `still (${reason.toLowerCase()})`}
      </p>
    </JourneyShell>
  );
};
