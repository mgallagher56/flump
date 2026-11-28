import { marketingMs } from "@repo/ui";
import type { GsapKit } from "../loadGsapKit";

/*
 * The arrive and leave of a pair (prototype 11's `stops/JourneyStop.tsx`): scroll triggers them,
 * time completes them (UX-GUIDELINES MK2). A pair's arrive is one timeline: both sides rise 24px
 * and fade in together, the panel's lines follow, and the sample plays its own moment. It is
 * built in units (the pair rises over 0 to 1, a moment runs from `MOMENT_START` to `MOMENT_END`)
 * and scaled to `arriveSeconds()`, so every moment keeps its share of the one calm duration.
 * Moves are by distance and opacity on the calm eases (MK4). Nothing is ever scrubbed.
 */

/** A GSAP timeline. */
export type MomentTimeline = ReturnType<GsapKit["gsap"]["timeline"]>;

/** A marketing duration in seconds, for GSAP. */
export const seconds = (key: Parameters<typeof marketingMs>[0]) => marketingMs(key) / 1000;

/**
 * A sample's moment: adds `root`'s motion to the arrive timeline, in timeline units from
 * `MOMENT_START`. Returns the elements it moves, so their transforms can be cleared at rest (MK3).
 */
export type SampleMoment = (kit: GsapKit, tl: MomentTimeline, root: HTMLElement) => Element[];

/** Where a sample's moment starts, in arrive units (just after the pair begins to rise). */
export const MOMENT_START = 0.3;
/** Where every arrive ends, in units: the timeline is scaled so this lands on `arriveSeconds()`. */
export const MOMENT_END = 2.4;

/** The whole arrive, on time: the entry duration times 1.6 (prototype 11). */
export const arriveSeconds = () => seconds("entry") * 1.6;
/** A pair's leave, and the quick going of a pair when the reader scrolls back. */
export const leaveSeconds = () => seconds("entry") * 0.45;

export interface ArriveParts {
  /** The two sides of the pair: they rise and fade in together. */
  readonly sides: readonly Element[];
  /** The panel's lines: they follow, a little apart. */
  readonly lines: readonly Element[];
  /** The sample and its moment. */
  readonly sample?: { readonly root: HTMLElement; readonly moment?: SampleMoment };
}

/**
 * The pair's arrive as one timeline in units, scaled to `arriveSeconds()`, ending at
 * `MOMENT_END`. Sides are hidden by opacity and take no pointer until the arrive starts, so a pair
 * still to come never catches a click meant for the pair on screen, yet its links stay in the Tab
 * order (the stop finishes its arrive when one takes focus). At the end every transform it left is
 * cleared (MK3).
 */
export function pairArrive(kit: GsapKit, parts: ArriveParts): MomentTimeline {
  const { gsap } = kit;
  const tl = gsap.timeline({ defaults: { ease: "calm" } });
  tl.fromTo(
    parts.sides,
    { y: 24, opacity: 0, pointerEvents: "none" },
    { y: 0, opacity: 1, pointerEvents: "auto", duration: 1 },
    0,
  );
  tl.fromTo(
    parts.lines,
    { y: 12, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
    0.15,
  );
  const moved = parts.sample?.moment ? parts.sample.moment(kit, tl, parts.sample.root) : [];
  tl.set({}, {}, MOMENT_END);
  tl.timeScale(tl.duration() / arriveSeconds());
  tl.eventCallback("onComplete", () => {
    gsap.set([...parts.sides, ...parts.lines, ...moved], { clearProps: "transform" });
  });
  return tl;
}

/**
 * A sample's moment on its own, paused, for a pair that is never hidden (`?stops=scroll`, where
 * the cards scroll with the page): the same units and calm duration as in `pairArrive`, with no
 * rise or fade of the sides. Its start state is drawn at once, so build it while the sample is
 * still below the window. At the end every transform it left is cleared (MK3).
 */
export function sampleArrive(
  kit: GsapKit,
  sample: { readonly root: HTMLElement; readonly moment: SampleMoment },
): MomentTimeline {
  const { gsap } = kit;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "calm" } });
  const moved = sample.moment(kit, tl, sample.root);
  tl.set({}, {}, MOMENT_END);
  tl.timeScale(tl.duration() / arriveSeconds());
  tl.eventCallback("onComplete", () => {
    gsap.set(moved, { clearProps: "transform" });
  });
  return tl;
}

/**
 * The pair's leave: it lifts a little and fades out together, on time. Paused until played. Like
 * the arrive it hides by opacity and takes no pointer once it starts, so a pair that has gone stays
 * in the Tab order (focus brings it back).
 */
export function pairLeave(kit: GsapKit, pair: Element) {
  return kit.gsap.fromTo(
    pair,
    { opacity: 1, y: 0, pointerEvents: "auto" },
    {
      opacity: 0,
      pointerEvents: "none",
      y: -20,
      ease: "calmInOut",
      duration: leaveSeconds(),
      paused: true,
      immediateRender: false,
    },
  );
}
