import { type FC, type ReactNode, type RefObject, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink } from "../../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS } from "../../../src/utils/featureAreas";
import { useMotion } from "../../shared/motion";
import { TIMING, usePace } from "../../shared/pace";
import { useGsap } from "../../shared/useGsap";
import type { OrbTone } from "../art/GlassOrb";
import { LitCtas } from "../hero/LitCtas";
import { journeyStopId, STOP_SHORT, type StopKey } from "../journeyTypes";
import { useNearGsap } from "../sections/useNearGsap";
import { MOMENT_END, STOP_VISUALS } from "./visuals";
import "./stops.css";

/*
 * One stop of the journey, shared by prototypes 11 and 11b: the text panel and the information
 * component, side by side (stacked on a phone), swapping sides at every stop.
 *
 * Choreography: scroll decides when, time decides how fast.
 * - The frames all hold in the same place under the header (see stops.css), one span of scroll
 *   apart (about 1.45 screens at Calm), so no screen is ever empty.
 * - Change-over: the middle of each stop's beat (`--p11-beat`). Crossing it, the previous pair
 *   leaves on time (both sides fade and lift together, about 0.7s at Calm), then ONE timeline
 *   brings both sides in together, in place, over about 2.5s: the pair rises 24px and fades in,
 *   the panel's lines follow, and the information component plays its own moment (cards dealt,
 *   bar filling, payslip opening, line drawing, figures counting). Nothing is scrubbed, so a
 *   reader who stops anywhere sees one finished pair, never a half-faded one or a figure
 *   mid-count. Scrolling back reverses it: this pair goes quickly, then the previous returns.
 * - Rest: the rest of the span. Nothing in the frame moves; only the orb behind keeps going.
 * - The last pair does not leave; it scrolls away with the page.
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

  // Set up only as the stop nears the viewport (one task each, one refresh), to break up the load.
  useNearGsap(
    ref,
    (kit, root) => {
      const { gsap, ScrollTrigger } = kit;
      const sides = root.querySelectorAll<HTMLElement>(".p11-stop__side");
      const pair = root.querySelector<HTMLElement>(".p11-stop__pair");
      const panelLines = root.querySelectorAll<HTMLElement>(".p11-stop__panel > *");
      const visual = root.querySelector<HTMLElement>(".p11-stop__visual");
      if (!pair || !visual) return;
      const head = () => document.querySelector("header")?.offsetHeight ?? 0;
      const frame = root.querySelector<HTMLElement>("[data-stop-frame]");
      // The beat (the frame starts that far above its section) and the span between stops.
      const beat = () => -(Number.parseFloat(frame ? getComputedStyle(frame).marginTop : "") || 0);
      // The span between this stop's top and the next one's (round four added a stray beat here,
      // so a pair left only after the next had landed and the two showed stacked).
      const next = root.nextElementSibling as HTMLElement | null;
      const span = () =>
        next?.hasAttribute("data-journey-stop")
          ? next.offsetTop - root.offsetTop
          : root.offsetHeight - (frame?.offsetHeight ?? 0);
      // The next stop's beat sets where this pair leaves (the first stop's own beat is zero).
      const nextFrame = next?.querySelector<HTMLElement>("[data-stop-frame]");
      const nextBeat = () =>
        -(Number.parseFloat(nextFrame ? getComputedStyle(nextFrame).marginTop : "") || 0);
      const last = index === total - 1;

      // The change-over point: the middle of this stop's beat. Crossing it plays the change on time, not with scroll, so a
      // reader who stops anywhere sees one finished pair: never half faded, never a figure
      // mid-count, never an empty screen beyond the brief swap.
      const leaveS = pace.s(TIMING.entry * 0.45);
      const arriveS = pace.s(TIMING.entry * 1.6);

      // Arrive: one timeline for both sides, after the previous pair has gone.
      const tl = gsap.timeline({ defaults: { ease: "calm" } });
      tl.fromTo(sides, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1 }, 0);
      tl.fromTo(
        panelLines,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
        0.15,
      );
      build(kit, tl, visual);
      tl.set({}, {}, MOMENT_END);
      tl.timeScale(tl.duration() / arriveS);
      const arrive = gsap.timeline({ paused: true });
      arrive.add(tl, index === 0 ? 0 : leaveS);

      ScrollTrigger.create({
        // The first pair has none to replace: it arrives as its frame comes up below the content
        // before the journey, so the screen between them is never empty.
        trigger: index === 0 && frame ? frame : root,
        start: () => (index === 0 ? "top 75%" : `top top+=${head() + beat() * 0.5}`),
        invalidateOnRefresh: true,
        onEnter: () => arrive.timeScale(1).play(),
        // Back up past it: this pair goes quickly, and the previous one returns (below).
        onLeaveBack: () => arrive.timeScale(arrive.duration() / leaveS).reverse(),
      });

      // The last frame is a full screen, but its pair is often shorter: pull what follows the
      // journey up over the empty foot of the frame, so no empty screen follows the last stop.
      if (last && frame) {
        const trim = () => {
          const empty = frame.getBoundingClientRect().bottom - pair.getBoundingClientRect().bottom;
          root.style.marginBottom = `${-Math.max(0, Math.round(empty - 56))}px`;
        };
        trim();
        ScrollTrigger.addEventListener("refreshInit", trim);
        return () => {
          ScrollTrigger.removeEventListener("refreshInit", trim);
          root.style.marginBottom = "";
        };
      }

      // Leave: at the next stop's change-over point, both sides together. The last pair stays.
      if (!last) {
        const leave = gsap.fromTo(
          pair,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, y: -20, ease: "calmInOut", duration: leaveS, paused: true },
        );
        let back: ReturnType<typeof gsap.delayedCall> | undefined;
        ScrollTrigger.create({
          trigger: root,
          start: () => `top top+=${head() + nextBeat() * 0.5 - span()}`,
          invalidateOnRefresh: true,
          onEnter: () => {
            back?.kill();
            leave.play();
          },
          // Wait while the next pair goes, so the two never overlap.
          onLeaveBack: () => {
            back?.kill();
            back = gsap.delayedCall(leaveS, () => {
              leave.reverse();
            });
          },
        });
      }
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
 * The scrim lets the travelling scene recede behind the stops (the owner found it distracting):
 * it fades in over the scroll into the first stop, so the hero keeps its full scene, and stays
 * for the rest of the journey.
 */
function useScrimFade(ref: RefObject<HTMLElement | null>): void {
  const pace = usePace();
  useGsap(
    ref,
    ({ gsap }, journey) => {
      const scrims = journey.querySelectorAll<HTMLElement>("[data-journey-scrim]");
      const first = journey.querySelector<HTMLElement>("[data-journey-stop]");
      if (!scrims.length || !first) return;
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
            scrub: pace.s(900),
            invalidateOnRefresh: true,
          },
        },
      );
    },
    [pace.pace],
  );
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
  /** False when the layer draws its own scrim (`data-journey-scrim`) inside itself. */
  scrim?: boolean;
  children?: ReactNode;
}> = ({ stops, intro, layer, className = "", journeyRef, scene, scrim = true, children }) => {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = journeyRef ?? ownRef;
  useJourneyLive(ref);
  useScrimFade(ref);
  return (
    <div className={`p11-journey ${className}`} data-journey="" data-scene={scene} ref={ref}>
      {layer}
      {scrim && (
        <div aria-hidden="true" className="p11-jscrim">
          <div className="p11-scrim-blur" data-journey-scrim="" />
          <div className="p11-scrim" data-journey-scrim="" />
        </div>
      )}
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
