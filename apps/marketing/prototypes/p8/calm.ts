import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL, TIMING } from "../shared/pace";

/*
 * Prototype 8's two kinds of movement, both from the pace tokens:
 *
 * - `arrive`: prototype 5's card and tag entry. A short rise (16px) and a fade, played once when
 *   the element comes into view, staggered with intent. Only elements still below the screen are
 *   hidden first, so nothing the reader can already see ever disappears.
 * - `scrubFor`: a scroll-scrubbed moment whose length is a pace-scaled distance, so the panel's
 *   Speed control lengthens or shortens every scene together.
 */

export function arrive(
  { gsap, ScrollTrigger }: GsapKit,
  elements: ArrayLike<Element>,
  pace: PaceState,
  distance = 16,
): void {
  const below = Array.from(elements).filter(
    (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92,
  );
  if (below.length === 0) return;
  gsap.set(below, { opacity: 0, y: distance });
  ScrollTrigger.batch(below, {
    start: "top 92%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: pace.s(TIMING.entry),
        ease: "calm",
        stagger: pace.s(TIMING.stagger),
        overwrite: true,
        // Hands the transform back to CSS, so a card's pointer tilt works once it has arrived.
        clearProps: "transform,opacity",
      }),
  });
}

/** Scroll settings for a scrubbed moment: starts as `trigger` comes in, lasts `moments` of SCROLL.moment. */
export const scrubFor = (
  trigger: Element,
  pace: PaceState,
  moments = 1,
  start = "top 85%",
): ScrollTrigger.Vars => ({
  trigger,
  start,
  end: () => `+=${pace.px(SCROLL.moment * moments)}`,
  // The soft lag behind the scroll, also paced: a fast flick still lands gently.
  scrub: pace.s(1000),
  invalidateOnRefresh: true,
});
