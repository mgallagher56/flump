import { css } from "@repo/ui/styled-system/css";

/** The two calls to action: centred while the hero is one column, from the left beside the picture. */
export const row = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "3",
  lg: { justifyContent: "flex-start" },
});

/**
 * Prototype 11's lit button (`[data-light]` in its round three kit): a soft light in the primary
 * foreground colour sits under the label where the pointer is, shown on hover, and the button leans
 * towards the pointer (`--tx`, `--ty`, written by `LitCtas`) and presses in a little when held.
 * The lean and the press are left out with reduced motion; the light needs a hover, so touch never
 * sees it.
 */
export const litButton = css({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  _before: {
    content: '""',
    position: "absolute",
    inset: "0",
    zIndex: "-1",
    borderRadius: "inherit",
    pointerEvents: "none",
    backgroundImage:
      "radial-gradient(140px circle at var(--lx, 50%) var(--ly, 50%), color-mix(in oklab, {colors.primary.foreground} 20%, transparent), transparent 70%)",
    opacity: "0",
    transitionProperty: "opacity",
    transitionDuration: "marketing.hover",
    transitionTimingFunction: "marketing.calm",
  },
  "&:hover::before": { opacity: "1" },
  _motionSafe: {
    transform: "translate(var(--tx, 0px), var(--ty, 0px))",
    transitionProperty: "transform, box-shadow, background-color",
    // The prototype eases back over its release time (784ms); the nearest token is the hover's.
    transitionDuration: "marketing.hover",
    transitionTimingFunction: "marketing.calm",
    _active: {
      transform: "translate(var(--tx, 0px), var(--ty, 0px)) scale(0.97)",
      // The prototype's press is 140ms x 1.4 = 196ms: the scale's 196ms step.
      transitionDuration: "marketing.stagger",
    },
  },
});
