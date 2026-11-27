import { usePrefersReducedMotion } from "@repo/ui";
import { type RefObject, useEffect, useRef } from "react";
import { useStillMotion } from "../context/StillMotionContext";
import { type GsapKit, loadGsapKit } from "./loadGsapKit";

type Job = () => void;
const queue: Job[] = [];
let draining = false;
let refreshAfter: GsapKit | null = null;

/** Runs queued set-ups one task apart, so no single task sets up the whole page, then refreshes ScrollTrigger once. */
function drain(): void {
  const job = queue.shift();
  if (!job) {
    draining = false;
    refreshAfter?.ScrollTrigger.refresh();
    refreshAfter = null;
    return;
  }
  job();
  window.setTimeout(drain, 0);
}

let watched: { main: HTMLElement; observer: ResizeObserver } | undefined;

/**
 * Below the hero the home page's bands skip layout until they near the viewport, so their real
 * height arrives late. Recompute every trigger's position when the page's height changes (debounced),
 * or a trigger set from a reserved height could fire early or never.
 */
function watchPageHeight(kit: GsapKit): void {
  if (typeof ResizeObserver === "undefined") return;
  const main = document.getElementById("main");
  // A link to another page and back mounts a new main: watch that one instead.
  if (!main || watched?.main === main) return;
  watched?.observer.disconnect();
  let timer: number | undefined;
  const observer = new ResizeObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => kit.ScrollTrigger.refresh(), 200);
  });
  observer.observe(main);
  watched = { main, observer };
}

function enqueue(job: Job): void {
  queue.push(job);
  if (!draining) {
    draining = true;
    window.setTimeout(drain, 0);
  }
}

/**
 * Runs one band's motion `setup` inside a `gsap.context` scoped to `root`, once GSAP has loaded
 * after first paint and the band is within about one and a half screens of the viewport. Set-ups
 * run one task apart and end with one `ScrollTrigger.refresh`, so the load never becomes one long
 * main-thread task (ROLLOUT-PLAN M1 notes). Everything is reverted on unmount.
 *
 * With reduced motion `setup` never runs and GSAP is never loaded (MK12), so the band must be
 * complete and still without it (MK1). While set up, `root` carries `data-enhanced="true"`.
 * `setup` may return a clean-up for anything outside GSAP (listeners, observers).
 *
 * Moments follow MK2: scroll may trigger, time completes. Use `scrollTrigger: { once: true }` and
 * never `scrub` on content.
 */
export function useGsapMoment(
  root: RefObject<HTMLElement | null>,
  setup: (kit: GsapKit, root: HTMLElement) => (() => void) | undefined,
  deps: readonly unknown[] = [],
): void {
  // A still page (reduced motion, or a story showing the rest state) never sets up a moment.
  const prefersReduced = usePrefersReducedMotion();
  const still = useStillMotion();
  const reduced = prefersReduced || still;
  // The latest `setup`, read when the band is set up; `key` re-runs it when `deps` change.
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const key = JSON.stringify(deps);
  useEffect(() => {
    void key;
    const element = root.current;
    if (!element || reduced || typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    let revert: (() => void) | undefined;

    const start = () => {
      loadGsapKit().then((kit) => {
        if (cancelled) return;
        enqueue(() => {
          if (cancelled) return;
          let extra: (() => void) | undefined;
          const ctx = kit.gsap.context(() => {
            extra = setupRef.current(kit, element);
          }, element);
          element.dataset.enhanced = "true";
          revert = () => {
            extra?.();
            ctx.revert();
            delete element.dataset.enhanced;
          };
          refreshAfter = kit;
          watchPageHeight(kit);
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
  }, [reduced, key, root]);
}
