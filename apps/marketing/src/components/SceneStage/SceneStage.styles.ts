import { css, cva } from "@repo/ui/styled-system/css";

/**
 * `screen`: the travelling layer (prototype 11's `p11-jstage`): one screen tall and sticky at the
 * top of its wrapper, pulled out of the flow by its own height so the content scrolls over it.
 * `band`: fills its positioned band behind the band's content (the other pages' hero scene, S1),
 * and is a size container, so a still layer can place itself in the band's own units.
 * Nothing in either takes the pointer, and each clips what it draws, so no orb runs past its edge.
 */
export const stage = cva({
  base: {
    pointerEvents: "none",
    overflow: "hidden",
    // The scene's canvas fills the stage and fades in once its first frame is drawn.
    "& canvas": {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      opacity: "0",
      _motionSafe: {
        transitionProperty: "opacity",
        transitionDuration: "marketing.entry",
        transitionTimingFunction: "marketing.calm",
      },
    },
    "&[data-scene=live] canvas": { opacity: "1" },
  },
  variants: {
    fit: {
      screen: {
        position: "sticky",
        top: "0",
        height: "100svh",
        marginBottom: "-100svh",
        zIndex: "0",
      },
      band: { position: "absolute", inset: "0", zIndex: "-1", containerType: "size" },
    },
  },
  defaultVariants: { fit: "screen" },
});

/**
 * The still (the server render, no JavaScript, reduced motion and a weak device, MK11): whatever
 * the caller passes, laid over the whole stage. Once the live scene has drawn it fades out as the
 * canvas fades in (the same picture, so a cross-fade, as the approved prototypes), and is hidden,
 * not removed: the hero scene reads its orbs' places from it on every resize.
 */
export const still = css({
  position: "absolute",
  inset: "0",
  _motionSafe: {
    transitionProperty: "opacity, visibility",
    transitionDuration: "marketing.entry",
    transitionTimingFunction: "marketing.calm",
  },
  "[data-scene=live] > &": { opacity: "0", visibility: "hidden" },
});
