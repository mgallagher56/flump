import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The journey's rail: the narrow column beside the stops where the orb and its bead track live
 * (STYLE-GUIDE 2.7: violet and rose only on orb-like elements, MC1). Nothing in it is text, and no
 * card, heading or line of text ever sits under it, so the orb never covers content (MK8).
 */

/** The rail fills its grid column, the full height of the journey. */
export const rail = css({
  position: "relative",
  height: "100%",
  pointerEvents: "none",
});

/**
 * The still orb (the server render, no JavaScript, reduced motion and a weak device, MK11): a
 * glass sphere in the sky and teal set, at the top of the rail beside the first stop, sized to the
 * rail so it is never cut by an edge.
 */
export const stillOrb = css({
  position: "absolute",
  top: "8px",
  left: "50%",
  width: { base: "20px", md: "32px", lg: "64px", xl: "80px" },
  height: { base: "20px", md: "32px", lg: "64px", xl: "80px" },
  marginLeft: { base: "-10px", md: "-16px", lg: "-32px", xl: "-40px" },
  borderRadius: "full",
  background:
    "radial-gradient(circle at 34% 28%, {colors.orb.skyTeal.bubble} 0, {colors.orb.skyTeal.core} 46%, {colors.orb.skyTeal.shade} 100%)",
  boxShadow:
    "inset 0 0 0 1px {colors.orb.skyTeal.rim}, inset -6px -8px 16px {colors.orb.skyTeal.rim}",
  _motionSafe: {
    transitionProperty: "opacity",
    transitionDuration: "marketing.entry",
    transitionTimingFunction: "marketing.calm",
  },
  // The live orb has drawn its first frame: the still steps back.
  "[data-scene=live] &": { opacity: 0 },
});

/** The still bead track: a dotted line down the rail from the still orb, in the orb's sky colour. */
export const stillTrack = css({
  position: "absolute",
  top: { base: "36px", md: "48px", lg: "84px", xl: "100px" },
  bottom: "8px",
  left: "50%",
  width: "6px",
  marginLeft: "-3px",
  backgroundImage: "radial-gradient(circle, {colors.orb.skyTeal.core} 1.5px, transparent 2px)",
  backgroundSize: "6px 14px",
  backgroundRepeat: "repeat-y",
  backgroundPosition: "center top",
  opacity: 0.6,
  _motionSafe: {
    transitionProperty: "opacity",
    transitionDuration: "marketing.entry",
    transitionTimingFunction: "marketing.calm",
  },
  "[data-scene=live] &": { opacity: 0 },
});

/**
 * The live scene's stage: one screen tall, sticky inside the rail, so the canvas stays beside the
 * stop being read. The canvas fills it and fades in once drawn.
 */
export const stage = css({
  position: "sticky",
  top: "0",
  height: "100svh",
  width: "100%",
  "& canvas": {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    opacity: 0,
    _motionSafe: {
      transitionProperty: "opacity",
      transitionDuration: "marketing.entry",
      transitionTimingFunction: "marketing.calm",
    },
    "[data-scene=live] &": { opacity: 1 },
  },
});

/**
 * The orb tokens as computed colours for the scene to read (it never writes a colour itself).
 * Never shown.
 */
export const swatch = cva({
  base: { display: "none" },
  variants: {
    tone: {
      sky: { color: "orb.skyTeal.core" },
      teal: { color: "orb.skyTeal.shade" },
      violet: { color: "orb.violetRose.core" },
      rose: { color: "orb.violetRose.shade" },
      canvas: { color: "surface.canvas" },
    },
  },
});
