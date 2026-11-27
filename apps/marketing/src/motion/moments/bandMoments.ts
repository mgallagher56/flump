import type { GsapKit } from "../loadGsapKit";
import { MOMENT_END, type SampleMoment, seconds } from "./arrive";

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
