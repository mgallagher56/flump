import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * GSAP with the plugins prototypes 4 to 7 may use, registered once. Loaded with a dynamic import
 * after hydration (see useGsap), so it is never in the first download. ScrollSmoother and
 * Observer-based wheel capture are deliberately left out: scroll stays native.
 */
gsap.registerPlugin(
  ScrollTrigger,
  Flip,
  SplitText,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
);

/** The site's own feel: quick to start, long soft settle. */
CustomEase.create("flump", "0.22, 1, 0.36, 1");
CustomEase.create("flumpInOut", "0.65, 0, 0.35, 1");
/** Round three (pace.tsx EASE): gentle, no overshoot. */
CustomEase.create("calm", "0.25, 0.1, 0.2, 1");
CustomEase.create("calmInOut", "0.45, 0, 0.3, 1");

export {
  CustomEase,
  DrawSVGPlugin,
  Flip,
  gsap,
  MorphSVGPlugin,
  MotionPathPlugin,
  ScrollTrigger,
  SplitText,
};
export type GsapKit = typeof import("./gsapKit");
