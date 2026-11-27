import { calmEase, calmInOutEase } from "@repo/ui";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * GSAP 3.15.1 with the plugins the home page uses, registered once (UX-GUIDELINES MK12; licence in
 * docs/legal/third-party-licences.md). Never imported statically: `loadGsapKit` loads this module
 * after first paint and never under reduced motion, so it is never in the first download. Scroll
 * stays native: no ScrollSmoother and no wheel capture.
 *
 * The two eases are the marketing tokens (`easings.marketing.calm` and `calmInOut`) as functions,
 * so a timeline follows the same curve as the CSS. Nothing overshoots (MK4).
 */
gsap.registerPlugin(ScrollTrigger, Flip);
gsap.registerEase("calm", calmEase);
gsap.registerEase("calmInOut", calmInOutEase);

export { Flip, gsap, ScrollTrigger };
