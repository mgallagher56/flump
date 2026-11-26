import { type FC, type ReactNode, type RefObject, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink } from "../../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS } from "../../../src/utils/featureAreas";
import { useMotion } from "../../shared/motion";
import { usePace } from "../../shared/pace";
import { useGsap } from "../../shared/useGsap";
import type { OrbTone } from "../art/GlassOrb";
import { LitCtas } from "../hero/LitCtas";
import { journeyStopId, STOP_SHORT, type StopKey } from "../journeyTypes";
import { MOMENT_END, STOP_VISUALS } from "./visuals";
import "./stops.css";

/*
 * One stop of the journey, shared by prototypes 11 and 11b: the text panel and the information
 * component, side by side (stacked on a phone), swapping sides at every stop.
 *
 * Choreography, all from scroll:
 * - The frames all hold in the same place under the header (see stops.css), one span of scroll
 *   apart, so a stop costs about half a screen and no screen is ever empty.
 * - Arrive (`--p11-beat`, about a fifth of a screen): ONE timeline moves both sides together, in
 *   place: the pair rises 24px and fades in, the panel's lines follow, and the information
 *   component plays its own moment (cards dealt, bar filling, payslip opening, line drawing,
 *   figures counting), in the second half of the beat; the previous pair leaves in the first half,
 *   so two pairs never overlap.
 * - Rest (`--p11-rest`, a little over a third of a screen at Calm, times the pace): nothing in the frame
 *   moves. Only the travelling layer behind (the orb) keeps going.
 * - Leave: in the next stop's arrive beat, both sides fade and lift together (short, so a leaving
 *   pair never lingers half-faded). The last pair does not fade; it scrolls away with the page.
 *
 * Before scripts, with reduced motion or no JS, the stop is a plain compact section: no sticky
 * rest, everything finished and visible.
 */

/** Each stop's colour (for a travelling layer that wants one), mixing both bubble sets. */
export const STOP_TONE: Record<StopKey, OrbTone> = {
  accounts: "sky",
  budget: "violet",
  pay: "teal",
  "savings-and-pension": "rose",
  "debt-and-borrowing": "violet",
  dashboard: "teal",
};

/** One short fact per area, from the feature pages' own facts. */
const FACT_INDEX: Record<string, number> = {
  accounts: 2,
  budget: 1,
  pay: 1,
  "savings-and-pension": 2,
  "debt-and-borrowing": 1,
};

interface StopCopy {
  title: string;
  lead: string;
  fact: string;
  link?: { to: string; label: string };
}

const copyFor = (key: StopKey): StopCopy => {
  if (key === "dashboard")
    return {
      title: "Where you stand, on one page",
      lead: "Your Home page shows your net worth, what is left over each month and your breathing room.",
      fact: "Breathing room is how long your savings would cover the essentials.",
    };
  const area = MONEY_AREAS.find((a) => a.key === key);
  return {
    title: area?.h1 ?? "",
    lead: area?.lead ?? "",
    fact: area?.facts[FACT_INDEX[key] ?? 0] ?? "",
    link: area ? { to: area.path, label: `About ${area.name.toLowerCase()} in Flump` } : undefined,
  };
};

export const JourneyStop: FC<{ stopKey: StopKey; index: number; total: number }> = ({
  stopKey,
  index,
  total,
}) => {
  const ref = useRef<HTMLElement>(null);
  const pace = usePace();
  const copy = copyFor(stopKey);
  const { Visual, build } = STOP_VISUALS[stopKey];
  const titleId = `${journeyStopId(stopKey)}-title`;
  const cardSide = index % 2 === 0 ? "right" : "left";

  useGsap(
    ref,
    (kit, root) => {
      const { gsap } = kit;
      const sides = root.querySelectorAll<HTMLElement>(".p11-stop__side");
      const pair = root.querySelector<HTMLElement>(".p11-stop__pair");
      const panelLines = root.querySelectorAll<HTMLElement>(".p11-stop__panel > *");
      const visual = root.querySelector<HTMLElement>(".p11-stop__visual");
      if (!pair || !visual) return;
      const head = () => document.querySelector("header")?.offsetHeight ?? 0;
      const frame = root.querySelector<HTMLElement>("[data-stop-frame]");
      // The beat (the frame starts that far above its section) and the span between stops.
      const beat = () => -(Number.parseFloat(frame ? getComputedStyle(frame).marginTop : "") || 0);
      const span = () => root.offsetHeight - (frame?.offsetHeight ?? 0) + beat();
      const last = index === total - 1;

      // Arrive: one timeline for both sides.
      const tl = gsap.timeline({
        defaults: { ease: "calm" },
        scrollTrigger: {
          trigger: root,
          // The second half of the beat (the previous pair leaves in the first half, so two
          // pairs never overlap), ending as the section's top reaches the header.
          start: () => `top top+=${head() + beat() * 0.5}`,
          end: () => `top top+=${head()}`,
          scrub: pace.s(500),
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(sides, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1 }, 0);
      tl.fromTo(
        panelLines,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
        0.15,
      );
      build(kit, tl, visual);
      tl.set({}, {}, MOMENT_END);

      // Leave: in the next stop's arrive beat, both sides together. The last pair stays.
      if (!last)
        gsap.fromTo(
          pair,
          { autoAlpha: 1, y: 0 },
          {
            autoAlpha: 0,
            y: -24,
            ease: "calmInOut",
            immediateRender: false,
            scrollTrigger: {
              trigger: root,
              // The first half of the next stop's beat.
              start: () => `top top+=${head() + beat() - span()}`,
              end: () => `top top+=${head() + beat() * 0.55 - span()}`,
              scrub: pace.s(500),
              invalidateOnRefresh: true,
            },
          },
        );
    },
    [pace.pace, index, total],
  );

  return (
    <section
      aria-labelledby={titleId}
      className="p11-stop"
      data-card-side={cardSide}
      data-journey-stop=""
      // The pair is complete when the section top meets the header (stops overlap on purpose).
      data-proto-line="0.02"
      data-proto-name={STOP_SHORT[stopKey]}
      data-proto-section=""
      data-stop={index + 1}
      data-stop-key={stopKey}
      id={journeyStopId(stopKey)}
      ref={ref}
    >
      <div className="p11-stop__frame" data-stop-frame="">
        <div className="p11-stop__pair">
          <div className="p11-stop__side p11-stop__side--panel">
            <div className="p11-stop__panel" data-tilt="">
              <p className="p11-stop__kicker">
                <span className="tabular-nums">
                  {index + 1} of {total}
                </span>
              </p>
              <h2 className="p11-stop__title" id={titleId}>
                {copy.title}
              </h2>
              <p className="p11-stop__lead">{copy.lead}</p>
              <p className="p11-stop__fact">{copy.fact}</p>
              {copy.link ? (
                <p className="p11-stop__link">
                  <Link className={bandLink()} to={copy.link.to}>
                    {copy.link.label}
                  </Link>
                </p>
              ) : (
                <div className="p11-stop__ctas">
                  <LitCtas />
                </div>
              )}
            </div>
          </div>
          <div className="p11-stop__side p11-stop__side--visual">
            <div className="p11-stop__visual">
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Turns the journey's sticky rests on once scripts run and motion is allowed, and keeps the
 * header's height in `--p11-head` for the sticky frames.
 */
function useJourneyLive(ref: RefObject<HTMLElement | null>): void {
  const { reduced } = useMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const header = document.querySelector("header");
    const set = () => el.style.setProperty("--p11-head", `${header?.offsetHeight ?? 0}px`);
    set();
    const observer = new ResizeObserver(set);
    if (header) observer.observe(header);
    el.dataset.live = "on";
    return () => {
      observer.disconnect();
      el.dataset.live = "off";
    };
  }, [ref, reduced]);
}

/**
 * The journey without its travelling layer: the wrapper (`data-journey`), the optional intro and
 * one JourneyStop per stop. `layer` is the travelling layer (aria-hidden), sticky behind the
 * stops; prototype 11 passes its three.js stage, 11b may pass its CSS one.
 */
export const JourneyShell: FC<{
  stops: readonly StopKey[];
  intro?: ReactNode;
  layer?: ReactNode;
  className?: string;
  journeyRef?: RefObject<HTMLDivElement | null>;
  scene?: string;
  children?: ReactNode;
}> = ({ stops, intro, layer, className = "", journeyRef, scene, children }) => {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = journeyRef ?? ownRef;
  useJourneyLive(ref);
  return (
    <div className={`p11-journey ${className}`} data-journey="" data-scene={scene} ref={ref}>
      {layer}
      {intro && (
        <div className="p11-journey__intro" data-journey-intro="">
          {intro}
        </div>
      )}
      {stops.map((key, index) => (
        <JourneyStop index={index} key={key} stopKey={key} total={stops.length} />
      ))}
      {children}
    </div>
  );
};
