import type { GsapKit } from "../loadGsapKit";
import { arriveSeconds, MOMENT_END, type SampleMoment, seconds } from "./arrive";

/*
 * The small moments of the features and area pages (the approved prototypes, `prototypes/others`
 * and prototype 11's `sections/moments.ts`): scroll triggers each once, time completes it (MK2), and
 * every transform is cleared at rest (MK3). For `useGsapMoment`, which never runs them under
 * reduced motion or once the visitor has paused animation.
 */

/** A band moment, for `useGsapMoment`. */
export type BandMoment = (kit: GsapKit, root: HTMLElement) => undefined;

/** Cards, tags and lines arrive in turn when the band comes into view: a short rise and a fade. */
export const arriveMoment =
  (selector: string, distance = 16): BandMoment =>
  ({ gsap }, root) => {
    const items = Array.from(root.querySelectorAll(selector));
    if (items.length === 0) return;
    gsap.from(items, {
      y: distance,
      opacity: 0,
      duration: seconds("entry"),
      stagger: seconds("stagger"),
      ease: "calm",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: root, start: "top 86%", once: true },
    });
  };

/**
 * Each item dealt in as it nears the viewport, on its own trigger: a 12px rise and a fade. For a
 * long list whose items enter the screen one by one (the index's groups, the area's tools).
 */
export const dealEachMoment =
  (selector: string): BandMoment =>
  ({ gsap }, root) => {
    for (const item of Array.from(root.querySelectorAll(selector))) {
      gsap.from(item, {
        y: 12,
        opacity: 0,
        duration: seconds("entry"),
        ease: "calm",
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: item, start: "top 90%", once: true },
      });
    }
  };

/** A list's items dealt in, in document order, staggered, when the list nears the viewport. */
export const dealInMoment =
  (selector: string): BandMoment =>
  ({ gsap }, root) => {
    const items = Array.from(root.querySelectorAll(selector));
    if (items.length === 0) return;
    gsap.from(items, {
      y: 12,
      opacity: 0,
      duration: seconds("entry"),
      stagger: seconds("stagger"),
      ease: "calm",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: root, start: "top 90%", once: true },
    });
  };

/**
 * One of the journey's samples played once on its own, as a set piece (the payslip unfolding, the
 * debt running down): its moment from `SAMPLE_MOMENTS`, in a timeline scaled to 2.2 entries, played
 * when the sample is well in view. A reader who stops scrolling sees it not started or finished,
 * never half way.
 */
export const setPieceMoment =
  (moment: SampleMoment): BandMoment =>
  (kit, root) => {
    const tl = kit.gsap.timeline({ paused: true, defaults: { ease: "calm" } });
    const moved = moment(kit, tl, root);
    tl.set({}, {}, MOMENT_END);
    tl.timeScale(tl.duration() / (seconds("entry") * 2.2));
    tl.eventCallback("onComplete", () => {
      if (moved.length > 0) kit.gsap.set(moved, { clearProps: "transform" });
    });
    kit.ScrollTrigger.create({
      trigger: root,
      start: "top 78%",
      once: true,
      onEnter: () => tl.play(),
    });
  };

/**
 * Prototype 10's unstack, the cascade of "More detail when you want it" and the FAQ (owner, 28 Nov
 * 2026, on top of prototype 11; `prototypes/shared/round3.tsx` `unstackMoment` at 8763cade2): the
 * sheets start as one stack on the first, each 7px lower and 20px further back in depth, the ones
 * behind at 85% opacity, then deal out into the list in turn on the calm in-out ease.
 */
const UNSTACK = {
  /** Each sheet in the stack sits this much lower than the one before (px). */
  step: 7,
  /** Each sheet in the stack sits this much further back (px of translateZ). */
  depth: 20,
  /** The opacity of every sheet behind the first while stacked. */
  behind: 0.85,
  /** The perspective the depth is seen through (px). */
  perspective: 1200,
  /** One sheet's move, in units (GSAP's default 0.5 s in the prototype). */
  sheet: 0.5,
  /** The gap between neighbouring sheets setting off, in units. */
  stagger: 0.12,
  /** Where the cascade starts: the list's top at 85% of the window. */
  start: "top 85%",
} as const;

/**
 * The unstack for `useGsapMoment`. Prototype 10 scrubbed it over 0.55 screens; here the list's top
 * reaching 85% of the window starts it and time finishes it (MK2): the whole cascade lasts
 * `arriveSeconds()` whatever the number of sheets (the prototype's ran over the same scroll in both
 * bands), keeping the prototype's shares of a sheet's move and the stagger. Each `selector` match
 * is a sheet, placed by its spot in the list; with `inner`, its first matching child is what moves
 * (a sheet inside a wrapper with a transform transition of its own, such as `TiltLight`). The stack
 * is a script-only from-state over the server's finished list (MK1), and at the end every transform
 * and opacity it set is cleared (MK3). Nothing changes size, so nothing shifts.
 *
 * The stack is a plain set and the timeline is paused, played by its own trigger: a timeline tied
 * to a ScrollTrigger is reverted on every refresh, which would put the sheets back at rest until
 * their turn, each then snapping onto the stack (as prototype 10's scrubbed run does).
 */
export const unstackMoment =
  (selector: string, inner?: string): BandMoment =>
  (kit, root) => {
    const { gsap, ScrollTrigger } = kit;
    const sheets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const first = sheets[0];
    if (!first) return;
    const moving = sheets.map((sheet) => (inner && sheet.querySelector(inner)) || sheet);
    // offsetTop ignores transforms, so a re-measure on a refresh never reads the stack itself.
    const lift = (i: number) => first.offsetTop - (sheets[i]?.offsetTop ?? 0) + i * UNSTACK.step;
    const stack = () =>
      gsap.set(moving, {
        y: lift,
        z: (i: number) => -i * UNSTACK.depth,
        opacity: (i: number) => (i ? UNSTACK.behind : 1),
        transformPerspective: UNSTACK.perspective,
        transformOrigin: "50% 0%",
      });
    stack();
    const tl = gsap.timeline({ paused: true });
    tl.to(moving, {
      y: 0,
      z: 0,
      opacity: 1,
      duration: UNSTACK.sheet,
      stagger: UNSTACK.stagger,
      ease: "calmInOut",
    });
    tl.timeScale(tl.duration() / arriveSeconds());
    tl.eventCallback("onComplete", () => {
      gsap.set(moving, { clearProps: "transform,transformOrigin,opacity" });
    });
    let played = false;
    const play = () => {
      played = true;
      tl.play();
    };
    ScrollTrigger.create({
      trigger: root,
      start: UNSTACK.start,
      once: true,
      onEnter: play,
      // Arriving from below the band (a link, a reload) still plays it, never leaving the stack.
      onLeave: play,
      // The list laid out again before its turn (a band above it grew): stack it on the new places.
      onRefresh: () => {
        if (!played) stack();
      },
    });
  };
