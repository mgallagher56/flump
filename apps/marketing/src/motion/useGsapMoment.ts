import { usePrefersReducedMotion } from "@repo/ui";
import { type RefObject, useEffect, useRef } from "react";
import { useAmbientMotion } from "../context/AmbientMotionContext";
import { useStillMotion } from "../context/StillMotionContext";
import { type GsapKit, loadGsapKit } from "./loadGsapKit";

type Job = () => void;
const queue: Job[] = [];
let pending: ReturnType<typeof setTimeout> | undefined;
let refreshAfter: GsapKit | null = null;

/** Puts the queue back to empty and idle, with no timer left behind. */
function stopQueue(): void {
  if (pending !== undefined) clearTimeout(pending);
  pending = undefined;
  queue.length = 0;
  refreshAfter = null;
}

/**
 * Runs queued set-ups one task apart, so no single task sets up the whole page, then refreshes
 * ScrollTrigger once. Stops without touching the page once the window has gone (a test
 * environment torn down while a set-up was still queued).
 */
function drain(): void {
  pending = undefined;
  if (typeof window === "undefined") {
    stopQueue();
    return;
  }
  const job = queue.shift();
  if (!job) {
    const kit = refreshAfter;
    refreshAfter = null;
    kit?.ScrollTrigger.refresh();
    return;
  }
  // The next turn is booked first, so a set-up that throws cannot stall the bands after it.
  pending = setTimeout(drain, 0);
  job();
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

/** Queues a set-up. Returns a function that takes it off the queue again if it has not run. */
function enqueue(job: Job): () => void {
  queue.push(job);
  pending ??= setTimeout(drain, 0);
  return () => {
    const at = queue.indexOf(job);
    if (at >= 0) queue.splice(at, 1);
    // Nothing left to set up or refresh: no timer stays behind.
    if (queue.length === 0 && refreshAfter === null) stopQueue();
  };
}

/**
 * Runs one band's motion `setup` inside a `gsap.context` scoped to `root`, once GSAP has loaded
 * after first paint and the band is within about one and a half screens of the viewport. Set-ups
 * run one task apart and end with one `ScrollTrigger.refresh`, so the load never becomes one long
 * main-thread task (ROLLOUT-PLAN M1 notes). Everything is reverted on unmount.
 *
 * After the visitor pauses animation (MotionControl), a moment not yet finished shows its end
 * state at once and never replays.
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
  // Once the visitor presses "Pause animation", every moment still to play shows its finished
  // state at once (its context is reverted) and never replays, even after "Play animation".
  const { paused } = useAmbientMotion();
  const stopped = useRef(false);
  if (paused) stopped.current = true;
  const reduced = prefersReduced || still || stopped.current;
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
    let dequeue: (() => void) | undefined;

    const start = () => {
      loadGsapKit().then((kit) => {
        if (cancelled) return;
        dequeue = enqueue(() => {
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
      dequeue?.();
      revert?.();
    };
  }, [reduced, key, root]);
}
