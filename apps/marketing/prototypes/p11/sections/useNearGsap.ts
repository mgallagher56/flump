import { type RefObject, useEffect } from "react";
import type { GsapKit } from "../../shared/gsapKit";
import { useMotion } from "../../shared/motion";

/*
 * Prototype 11's copy of shared/useGsap, changed to break up the load: a band's GSAP set-up waits
 * until the band is within about one and a half screens of the viewport, each set-up runs in its
 * own task, and the queue ends with ONE ScrollTrigger.refresh instead of one per band. (The shared
 * hook sets up every band in the same task and refreshes after each, which measured as one long
 * main-thread task at load.) Same contract: nothing runs with reduced motion, so the page must be
 * finished and still without it; `setup` may return a clean-up.
 */

type Job = () => void;
const queue: Job[] = [];
let draining = false;
let refreshAfter: GsapKit | null = null;

/** Runs queued set-ups one task apart, then refreshes ScrollTrigger once. */
function drain(): void {
  const job = queue.shift();
  if (!job) {
    draining = false;
    refreshAfter?.ScrollTrigger.refresh();
    refreshAfter = null;
    return;
  }
  job();
  setTimeout(drain, 0);
}

function enqueue(job: Job): void {
  queue.push(job);
  if (!draining) {
    draining = true;
    setTimeout(drain, 0);
  }
}

export function useNearGsap(
  root: RefObject<HTMLElement | null>,
  // biome-ignore lint/suspicious/noConfusingVoidType: setups may return nothing or a clean-up.
  setup: (kit: GsapKit, root: HTMLElement) => (() => void) | void,
  deps: readonly unknown[] = [],
): void {
  const { reduced } = useMotion();
  useEffect(() => {
    const element = root.current;
    if (!element || reduced) return;
    let cancelled = false;
    let revert: (() => void) | undefined;

    const start = () => {
      import("../../shared/gsapKit").then((kit) => {
        if (cancelled) return;
        enqueue(() => {
          if (cancelled) return;
          // biome-ignore lint/suspicious/noConfusingVoidType: as above.
          let extra: (() => void) | void;
          const ctx = kit.gsap.context(() => {
            extra = setup(kit, element);
          }, element);
          element.dataset.enhanced = "true";
          revert = () => {
            extra?.();
            ctx.revert();
            element.dataset.enhanced = "false";
          };
          refreshAfter = kit;
        });
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      revert?.();
    };
  }, [reduced, ...deps]);
}
