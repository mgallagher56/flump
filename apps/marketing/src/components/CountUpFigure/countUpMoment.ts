import type { MomentTimeline } from "../../motion/moments/arrive";
import { figureFormat } from "./figureFormats";

/*
 * The count-up moment (STYLE-GUIDE 11.2, UX-GUIDELINES MK13): a `CountUpFigure`'s visible digits
 * count from `data-count-from` to `data-count` on the calm ease, inside the timeline of the moment
 * that shows them, so the count plays once, on time, and is over before the reader rests. Only the
 * aria-hidden digits change; the final value is in the HTML throughout (MK10).
 */

/** Adds the count of `el` (a `[data-count]` element) to `tl` at `at` seconds, over `duration`. */
export function countUpMoment(
  tl: MomentTimeline,
  el: HTMLElement | null,
  at: number,
  duration: number,
): void {
  if (!el) return;
  const value = Number(el.dataset.count);
  const from = Number(el.dataset.countFrom ?? 0);
  const format = figureFormat(el.dataset.format);
  const proxy = { v: from };
  let last = "";
  const write = () => {
    const text = format(proxy.v);
    if (text !== last) {
      last = text;
      el.textContent = text;
    }
  };
  tl.fromTo(
    proxy,
    { v: from },
    { v: value, duration, ease: "calm", onUpdate: write, onComplete: write },
    at,
  );
}

/** Puts every count under `root` back on its final value (after a moment is reverted mid-count). */
export function settleCounts(root: ParentNode): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-count]"))) {
    el.textContent = figureFormat(el.dataset.format)(Number(el.dataset.count));
  }
}
