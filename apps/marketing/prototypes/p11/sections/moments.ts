import type { GsapKit } from "../../shared/gsapKit";
import { type PaceState, SCROLL, TIMING } from "../../shared/pace";

/*
 * Prototype 11's small shared moments, all paced. Entries are prototype 5's card and tag entries:
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

/**
 * A list's items dealt in, in document order: a small rise and a fade, staggered, played once when
 * the list nears the viewport and finishing on its own (time-based, paced). Never tied to scroll,
 * and transforms are cleared afterwards, so an opening answer always pushes the next items down.
 */
export function dealIn(
  { gsap }: GsapKit,
  trigger: Element,
  targets: Iterable<Element> | ArrayLike<Element>,
  pace: PaceState,
): void {
  const list = Array.from(targets);
  if (list.length === 0) return;
  gsap.from(list, {
    y: 12,
    opacity: 0,
    duration: pace.s(TIMING.entry),
    stagger: pace.s(TIMING.stagger),
    ease: "calm",
    clearProps: "transform,opacity",
    scrollTrigger: { trigger, start: "top 90%", once: true },
  });
}
