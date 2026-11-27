import { css, cva } from "@repo/ui/styled-system/css";

/** The layer: fills its band, takes no space and no pointer, sits behind the band's content. */
export const field = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
  overflow: "hidden",
  // The band's own content stacks above the field.
  "& ~ *": { position: "relative", zIndex: 1 },
});

/**
 * One bubble: a soft sphere in one of the two orb sets (STYLE-GUIDE 2.7; violet and rose only on
 * orb-like elements, MC1). Sizes: `lg` and `md` show only where the side gutters can hold them, so
 * no bubble sits behind text; `sm` sits inside the band's top or bottom padding at every width.
 * Every bubble is placed at least 12px inside its band, so none is ever cut by an edge (MK8). The
 * drift is slow and small, stops under reduced motion, and pauses with the page's control (MK14).
 */
export const bubble = cva({
  base: {
    position: "absolute",
    borderRadius: "full",
    _motionSafe: {
      animationName: "marketingDrift",
      // About 19 seconds a sweep: ambient, never attention-seeking.
      animationDuration: "calc({durations.marketing.hero} * 4)",
      animationTimingFunction: "marketing.calmInOut",
      animationIterationCount: "infinite",
      animationDirection: "alternate",
      // While the visitor has paused ambient motion (AmbientMotionContext). Written out, not
      // imported, because Panda extracts styles statically.
      "html[data-ambient=paused] &": { animationPlayState: "paused" },
    },
  },
  variants: {
    set: {
      skyTeal: {
        background:
          "radial-gradient(circle at 32% 28%, {colors.orb.skyTeal.bubble}, {colors.orb.skyTeal.bubbleShade} 80%)",
        boxShadow: "inset 0 0 0 1px {colors.orb.skyTeal.rim}",
      },
      violetRose: {
        background:
          "radial-gradient(circle at 32% 28%, {colors.orb.violetRose.bubble}, {colors.orb.violetRose.bubbleShade} 80%)",
        boxShadow: "inset 0 0 0 1px {colors.orb.violetRose.rim}",
      },
    },
    size: {
      // In the side gutter of a 1200px content column: wide screens only.
      lg: {
        width: "180px",
        height: "180px",
        display: "none",
        "--drift-from": "16px",
        "--drift-to": "-16px",
        "@media (min-width: 1600px)": { display: "block" },
      },
      md: {
        width: "72px",
        height: "72px",
        display: "none",
        "--drift-from": "28px",
        "--drift-to": "-28px",
        "@media (min-width: 1360px)": { display: "block" },
      },
      // Inside the band's vertical padding (48px, 64px from md), clear of the text.
      sm: {
        width: "32px",
        height: "32px",
        "--drift-from": "4px",
        "--drift-to": "-4px",
      },
    },
    side: {
      left: { left: "12px" },
      right: { right: "12px" },
    },
    edge: {
      top: { top: "10px" },
      bottom: { bottom: "10px" },
      upper: { top: "18%" },
      lower: { bottom: "18%" },
    },
  },
});
