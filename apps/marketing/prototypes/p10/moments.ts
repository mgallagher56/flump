import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL, TIMING } from "../shared/pace";

/*
 * Prototype 10's small shared moments, all paced. Entries are prototype 5's card and tag entries:
 * a short rise (16px) and a fade, staggered, played once on arrival. No scale, skew or swing.
 */

/** Cards, tags and lines arrive in turn the first time `trigger` comes into view. */
export function arrive(
  { gsap }: GsapKit,
  trigger: Element,
  targets: Iterable<Element> | ArrayLike<Element>,
  pace: PaceState,
  distance = 16,
): void {
  const list = Array.from(targets);
  if (list.length === 0) return;
  gsap.from(list, {
    y: distance,
    opacity: 0,
    duration: pace.s(TIMING.entry),
    stagger: pace.s(TIMING.stagger),
    ease: "calm",
    scrollTrigger: { trigger, start: "top 86%", once: true },
  });
}

/** A scrubbed moment's ScrollTrigger: from `start` over a paced share of the screen. */
export const momentScroll = (
  trigger: Element,
  pace: PaceState,
  screens: number = SCROLL.moment,
) => ({
  trigger,
  start: "top 84%",
  end: () => `+=${pace.px(screens)}`,
  scrub: 0.8,
  invalidateOnRefresh: true,
});
