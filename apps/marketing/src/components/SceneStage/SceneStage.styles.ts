import { css } from "@repo/ui/styled-system/css";

/**
 * The travelling layer (prototype 11's `p11-jstage`): one screen tall and sticky at the top of
 * its wrapper, pulled out of the flow by its own height so the content scrolls over it. Nothing
 * in it takes the pointer, and it clips what it draws, so no orb runs past the screen's edge.
 */
export const stage = css({
  position: "sticky",
  top: "0",
  height: "100svh",
  marginBottom: "-100svh",
  zIndex: "0",
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
});

/**
 * The still (the server render, no JavaScript, reduced motion and a weak device, MK11): whatever
 * the caller passes, laid over the whole stage. Gone once the live scene has drawn.
 */
export const still = css({
  position: "absolute",
  inset: "0",
  "[data-scene=live] > &": { display: "none" },
});
