import type { GsapKit } from "../../motion/loadGsapKit";
import { MOMENT_START, type MomentTimeline } from "../../motion/moments/arrive";

/*
 * The payslip's unfold (STYLE-GUIDE 11.2; prototype 11's `buildPay`), in arrive units: the lower
 * third turns down from behind, then the top third turns up off the front, each losing its shade
 * as it opens; then the rule under take-home pay draws. Ends lying open and flat.
 */
export function unfoldMoment(_kit: GsapKit, tl: MomentTimeline, root: HTMLElement): Element[] {
  const bottom = root.querySelector("[data-fold=bottom]");
  const top = root.querySelector("[data-fold=top]");
  const rule = root.querySelector("[data-payslip-rule]");
  const turn = { duration: 0.8, ease: "calmInOut" };
  const at = MOMENT_START;
  if (bottom) {
    tl.fromTo(bottom, { rotationX: 178 }, { rotationX: 0, ...turn }, at);
    tl.fromTo(
      bottom.querySelector("[data-fold-shade]"),
      { opacity: 0.45 },
      { opacity: 0, ...turn },
      at,
    );
  }
  if (top) {
    tl.fromTo(top, { rotationX: -178 }, { rotationX: 0, ...turn }, at + 0.7);
    tl.fromTo(
      top.querySelector("[data-fold-shade]"),
      { opacity: 0.45 },
      { opacity: 0, ...turn },
      at + 0.7,
    );
  }
  if (rule) tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "calm" }, at + 1.5);
  return [bottom, top, rule].filter((el): el is Element => el !== null);
}
