import { usePrefersReducedMotion } from "@repo/ui";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { useStillMotion } from "../../context/StillMotionContext";
import type { JourneyPalette } from "../../motion/journey/journeyScene";
import { loadJourneyScene } from "../../motion/journey/loadJourneyScene";
import { afterFirstPaint, loadGsapKit } from "../../motion/loadGsapKit";
import { seconds } from "../../motion/moments/arrive";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { GlassOrb, ORB_TONES, type OrbTone } from "../GlassOrb";
import { JourneyStop } from "../JourneyStop";
import { JOURNEY_STOPS } from "../JourneyStop/journeyStops";
import { SceneStage, type SceneStartContext } from "../SceneStage";
import * as s from "./HomeJourney.styles";

const SWATCHES = ["canvas", "floor", "ink", "primary"] as const;
const STILL_ORBS: readonly { place: 1 | 2 | 3 | 4; tone: OrbTone }[] = [
  { place: 1, tone: "sky" },
  { place: 2, tone: "violet" },
  { place: 3, tone: "teal" },
  { place: 4, tone: "rose" },
];

/** The scene's colours, read from the still orbs and the swatches as computed CSS colours. */
const readPalette = (stage: HTMLElement): JourneyPalette => {
  const colour = (selector: string) => {
    const el = stage.querySelector<HTMLElement>(selector);
    return el ? getComputedStyle(el).color : "";
  };
  const tones = Object.fromEntries(
    ORB_TONES.map((tone) => [tone, colour(`[data-orb-tone="${tone}"]`)]),
  ) as Record<OrbTone, string>;
  return {
    tones,
    canvas: colour('[data-scene-swatch="canvas"]'),
    floor: colour('[data-scene-swatch="floor"]'),
    ink: colour('[data-scene-swatch="ink"]'),
    primary: colour('[data-scene-swatch="primary"]'),
  };
};

/**
 * The journey (ROLLOUT-PLAN M1 and M2, built to prototype 11): the intro, then six stops, the five
 * areas and the picture they make, over a full-screen travelling layer where a glass orb rolls
 * along a winding bead track in the lane under each stop.
 *
 * Without JavaScript, and with reduced motion, it is a plain vertical list of the six stops in
 * reading order, everything finished and visible, over still glass orbs at the screen's edges
 * (MK1, MK11). Once scripts run, motion is allowed and GSAP has loaded, the journey goes live
 * (`data-live="on"`): each stop pins as a full screen under the header and the pairs change over in
 * place, triggered by scroll and completed by time (MK2), and a scrim fades in over the scroll into
 * the first stop so the scene recedes behind the stops. The scrim is decoration behind the content,
 * so tying its opacity to scroll does not break MK2's rule on content. Turning on "Reduce
 * motion" in the header (MK14) stills the scene and returns the stops to the plain list.
 */
export const HomeJourney: FC = () => {
  const journeyRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();
  const still = useStillMotion();
  // Reduced motion turned on mid-page (the header's "Reduce motion") returns the stops to the plain
  // list for the rest of this page view; the next visit to the page has the live journey again.
  const stopped = useRef(false);
  if (prefersReduced) stopped.current = true;
  const [ready, setReady] = useState(false);
  const live = ready && !prefersReduced && !still && !stopped.current;

  // The pinned changeovers need GSAP: go live only once it has loaded (never under reduced motion).
  // The first render after hydration reads motion as allowed (the server's answer), so the request
  // waits for first paint and is dropped if reduced motion has cancelled this effect by then.
  useEffect(() => {
    if (prefersReduced || still) return;
    let cancelled = false;
    afterFirstPaint()
      .then(() => (cancelled ? undefined : loadGsapKit()))
      .then((kit) => {
        if (kit && !cancelled) setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prefersReduced, still]);

  // Keep the header's height for the sticky frames.
  useEffect(() => {
    const el = journeyRef.current;
    if (!live || !el) return;
    const header = document.querySelector("header");
    const set = () => el.style.setProperty("--journey-head", `${header?.offsetHeight ?? 0}px`);
    set();
    if (typeof ResizeObserver === "undefined" || !header) return;
    const observer = new ResizeObserver(set);
    observer.observe(header);
    return () => {
      observer.disconnect();
      el.style.removeProperty("--journey-head");
    };
  }, [live]);

  // The scrim fades in over the scroll into the first stop, so the hero keeps its full scene.
  useGsapMoment(
    journeyRef,
    ({ gsap }, root) => {
      if (!live) return undefined;
      const scrims = root.querySelectorAll<HTMLElement>("[data-journey-scrim]");
      const first = root.querySelector<HTMLElement>("[data-journey-stop]");
      if (!scrims.length || !first) return undefined;
      gsap.fromTo(
        scrims,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: first,
            start: "top bottom",
            end: "top 40%",
            scrub: seconds("disclosure"),
            invalidateOnRefresh: true,
          },
        },
      );
      return undefined;
    },
    [live],
  );

  const start = useCallback(async (context: SceneStartContext) => {
    const journey = journeyRef.current;
    if (!journey) throw new Error("The journey is not mounted");
    const { createJourneyScene } = await loadJourneyScene();
    return createJourneyScene({
      ...context,
      journey,
      stopTones: JOURNEY_STOPS.map((stop) => stop.orbTones),
      palette: () => readPalette(context.container),
    });
  }, []);

  return (
    <div
      className={s.journey}
      data-journey=""
      data-live={live ? "on" : "off"}
      data-testid="home-journey"
      id="journey"
      ref={journeyRef}
    >
      <SceneStage data-testid="journey-stage" start={start} watchRef={journeyRef}>
        {STILL_ORBS.map(({ place, tone }) => (
          <span className={s.stillOrb({ place })} data-still-orb={place} key={place}>
            <GlassOrb tone={tone} />
          </span>
        ))}
        {SWATCHES.map((tone) => (
          <span className={s.swatch({ tone })} data-scene-swatch={tone} key={tone} />
        ))}
      </SceneStage>
      <div aria-hidden="true" className={s.scrimLayer}>
        <div className={s.scrimBlur} data-journey-scrim="" />
        <div className={s.scrim} data-journey-scrim="" />
      </div>
      <div className={s.intro} data-journey-intro="">
        <div className={s.head}>
          <h2 className={s.title} id="journey-title">
            From rough figures to one picture
          </h2>
          <p className={s.lead}>
            Five areas, one at a time: what you have, what comes in and goes out, your pay, what you
            put by and what you owe. Then the picture they make.
          </p>
        </div>
      </div>
      {JOURNEY_STOPS.map((stop, index) => (
        <JourneyStop
          index={index}
          key={stop.key}
          live={live}
          stop={stop}
          total={JOURNEY_STOPS.length}
        />
      ))}
    </div>
  );
};
