import { type RefObject, useEffect } from "react";
import type { GsapKit } from "./gsapKit";
import { useMotion } from "./motion";

/**
 * Runs `setup` once GSAP has loaded, inside a gsap.context scoped to `root`, and reverts it on
 * unmount or when motion is reduced (from the system or the panel switch). With reduced motion
 * `setup` never runs, so the page must already be finished and still without it.
 *
 * `setup` may return a clean-up for anything outside GSAP (listeners, observers).
 */
export function useGsap(
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
    import("./gsapKit").then((kit) => {
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
      kit.ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [reduced, ...deps]);
}
