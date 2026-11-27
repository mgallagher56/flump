import { css, cva } from "@repo/ui/styled-system/css";

/**
 * The layer: fills its band, takes no space and no pointer, sits behind the band's content. Not
 * clipped: a bubble may run past the band's box, as in prototype 11, rather than end in a straight
 * cut; the page shell clips sideways overflow, so the page never scrolls sideways.
 */
export const field = cva({
  base: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    // The band's own content stacks above the field.
    "& ~ *": { position: "relative", zIndex: 1 },
  },
  variants: {
    fit: {
      band: {},
      // The hero keeps two bubbles; on a narrow screen the field starts 40% down, clear of the heading.
      hero: {
        "& > span:nth-child(3)": { display: "none" },
        "@media (max-width: 55.99rem)": { inset: "40% 0 0" },
      },
      // Beside a second list, and in the close, the small upper bubble would sit on the heading.
      beside: { "& > span:nth-child(2)": { display: "none" } },
      // Behind a journey sample (prototype 11's `.p11-v-accounts > .proto-bubbles`): a little past
      // the sample's box, and all three bubbles at full size at every width, since the journey is
      // not one of the prototype's bands.
      sample: {
        inset: "-24px -16px",
        "& > span": { display: "block", scale: "1" },
      },
    },
  },
  defaultVariants: { fit: "band" },
});

/**
 * One bubble: a soft sphere in one of the two orb sets (STYLE-GUIDE 2.7; violet and rose only on
 * orb-like elements, MC1). Where the browser supports scroll-driven animation, it drifts between
 * `--drift-from` and `--drift-to` as its band crosses the screen (prototype 11), so it moves only
 * when the reader scrolls. Still with reduced motion and while the visitor has paused animation
 * (MK14). On a narrow screen only the first, large bubble stays, at a little over half size and
 * pushed to its edge, so none sits behind the copy.
 */
export const bubble = cva({
  base: {
    position: "absolute",
    borderRadius: "full",
    opacity: 0.85,
    _motionSafe: {
      "@supports (animation-timeline: view())": {
        animationName: "marketingDrift",
        animationTimingFunction: "linear",
        animationFillMode: "both",
        animationTimeline: "view()",
        animationRange: "cover 0% cover 100%",
      },
      // While the visitor has paused animation (AmbientMotionContext). Written out, not imported,
      // because Panda extracts styles statically.
      "html[data-ambient=paused] &": { animationName: "none" },
    },
  },
  variants: {
    set: {
      skyTeal: {
        background:
          "radial-gradient(circle at 35% 30%, {colors.orb.skyTeal.bubble}, {colors.orb.skyTeal.bubbleShade} 80%)",
        boxShadow: "inset 0 0 0 1px {colors.orb.skyTeal.rim}",
      },
      violetRose: {
        background:
          "radial-gradient(circle at 35% 30%, {colors.orb.violetRose.bubble}, {colors.orb.violetRose.bubbleShade} 80%)",
        boxShadow: "inset 0 0 0 1px {colors.orb.violetRose.rim}",
      },
    },
    order: {
      first: { "@media (max-width: 55.99rem)": { scale: "0.55" } },
      second: { "@media (max-width: 55.99rem)": { display: "none" } },
      third: { "@media (max-width: 55.99rem)": { display: "none" } },
    },
  },
});

/*
 * Prototype 11's places, layout by layout, in the order of `BUBBLE_LAYOUTS`: size, edge and drift.
 * A bubble at the right shrinks towards the right edge on a narrow screen, one at the left towards
 * the left.
 */
const toRight = { "@media (max-width: 55.99rem)": { transformOrigin: "100% 50%" } };
const toLeft = { "@media (max-width: 55.99rem)": { transformOrigin: "0% 50%" } };

export const BUBBLE_PLACES = {
  a: [
    css({
      width: "260px",
      height: "260px",
      right: "-90px",
      top: "8%",
      "--drift-from": "24px",
      "--drift-to": "-24px",
      ...toRight,
    }),
    css({
      width: "120px",
      height: "120px",
      right: "12%",
      bottom: "6%",
      "--drift-from": "60px",
      "--drift-to": "-60px",
      ...toRight,
    }),
    css({
      width: "70px",
      height: "70px",
      left: "-20px",
      top: "34%",
      "--drift-from": "100px",
      "--drift-to": "-100px",
      ...toLeft,
    }),
  ],
  b: [
    css({
      width: "300px",
      height: "300px",
      left: "-140px",
      bottom: "8%",
      "--drift-from": "24px",
      "--drift-to": "-24px",
      ...toLeft,
    }),
    css({
      width: "96px",
      height: "96px",
      right: "4%",
      top: "12%",
      "--drift-from": "60px",
      "--drift-to": "-60px",
      ...toRight,
    }),
    css({
      width: "54px",
      height: "54px",
      right: "24%",
      bottom: "4%",
      "--drift-from": "100px",
      "--drift-to": "-100px",
      ...toRight,
    }),
  ],
  c: [
    css({
      width: "180px",
      height: "180px",
      right: "-60px",
      bottom: "12%",
      "--drift-from": "30px",
      "--drift-to": "-30px",
      ...toRight,
    }),
    css({
      width: "80px",
      height: "80px",
      left: "6%",
      top: "10%",
      "--drift-from": "80px",
      "--drift-to": "-80px",
      ...toLeft,
    }),
  ],
} as const;
