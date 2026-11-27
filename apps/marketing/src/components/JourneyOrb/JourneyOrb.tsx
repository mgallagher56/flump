import { createFrameRateCheck, useScenePower } from "@repo/ui";
import { type FC, type RefObject, useEffect, useRef, useState } from "react";
import { useAmbientMotion } from "../../context/AmbientMotionContext";
import type { JourneyPalette, JourneySceneHandle } from "../../motion/journey/journeyScene";
import { loadJourneyScene } from "../../motion/journey/loadJourneyScene";
import type { JourneyOrbTone } from "../JourneyStop/journeyStops";
import { rail, stage, stillOrb, stillTrack, swatch } from "./JourneyOrb.styles";

export interface JourneyOrbProps {
  /** The journey: the scene measures its stops' markers (`[data-stop-marker]`) and pauses off screen. */
  journeyRef: RefObject<HTMLElement | null>;
  /** Each stop's orb colour, in stop order. */
  tones: readonly JourneyOrbTone[];
}

const SWATCHES = ["sky", "teal", "violet", "rose", "canvas"] as const;

/**
 * The journey's orb, in the rail beside the stops. Decoration only: hidden from assistive
 * technology, the canvas too.
 *
 * The server render, a page with JavaScript off and a reduced-motion page show the still orb and
 * a still dotted track (MK1). The live three.js orb loads after first paint, by dynamic import,
 * only when `useScenePower()` says `live` and the journey is near the viewport; under reduced
 * motion, data saver, under 4 GB or 4 cores, without WebGL or under 28 fps it stays the still orb
 * and nothing else changes (MK11). The scene pauses in a hidden tab, off screen and while the
 * page's ambient motion is paused (MK14).
 */
export const JourneyOrb: FC<JourneyOrbProps> = ({ journeyRef, tones }) => {
  const power = useScenePower();
  const { running } = useAmbientMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<JourneySceneHandle | null>(null);
  const runningRef = useRef(running);
  runningRef.current = running;
  const tonesRef = useRef(tones);
  tonesRef.current = tones;
  const reportFps = power.reportFps;
  // The scene gave up (context lost, or the download failed): the still stays for this visit.
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const live = power.mode === "live" && !failed;

  useEffect(() => {
    const journey = journeyRef.current;
    const railEl = railRef.current;
    const stageEl = stageRef.current;
    if (!live || !journey || !railEl || !stageEl) return;
    let cancelled = false;
    let handle: JourneySceneHandle | null = null;

    const readPalette = (): JourneyPalette => {
      const colour = (name: string) => {
        const el = railEl.querySelector<HTMLElement>(`[data-orb-swatch="${name}"]`);
        return el ? getComputedStyle(el).color : "";
      };
      return { stopTones: tonesRef.current.map(colour), canvas: colour("canvas") };
    };

    const start = () => {
      loadJourneyScene()
        .then(({ createJourneyScene }) => {
          if (cancelled) return null;
          return createJourneyScene({
            stage: stageEl,
            rail: railEl,
            journey,
            markers: () => Array.from(journey.querySelectorAll<HTMLElement>("[data-stop-marker]")),
            palette: readPalette,
            frameCheck: createFrameRateCheck(),
            running: runningRef.current,
            onVerdict: (verdict) => reportFps(verdict.fps),
            onLost: () => setFailed(true),
            onFirstFrame: () => {
              if (!cancelled) setDrawn(true);
            },
          });
        })
        .then((created) => {
          if (!created) return;
          if (cancelled) {
            created.dispose();
            return;
          }
          handle = created;
          handleRef.current = created;
          created.setRunning(runningRef.current);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };

    // Load only once the journey is within about a screen and a half of the viewport.
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") start();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            start();
          }
        },
        { rootMargin: "150% 0px 150% 0px" },
      );
      observer.observe(journey);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      handle?.dispose();
      handleRef.current = null;
      setDrawn(false);
    };
  }, [live, journeyRef, reportFps]);

  useEffect(() => {
    handleRef.current?.setRunning(running);
  }, [running]);

  // A theme change re-reads the orb tokens.
  useEffect(() => {
    if (!live) return;
    const observer = new MutationObserver(() => handleRef.current?.refreshColours());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [live]);

  const scene = live && drawn ? "live" : "still";
  return (
    <div
      aria-hidden="true"
      className={rail}
      data-scene={scene}
      data-still-reason={
        scene === "still" ? (failed ? "failed" : (power.reason ?? "loading")) : undefined
      }
      data-testid="journey-orb"
      ref={railRef}
    >
      <span className={stillTrack} />
      <span className={stillOrb} data-testid="journey-still-orb" />
      <div className={stage} ref={stageRef} />
      {SWATCHES.map((tone) => (
        <span className={swatch({ tone })} data-orb-swatch={tone} key={tone} />
      ))}
    </div>
  );
};
