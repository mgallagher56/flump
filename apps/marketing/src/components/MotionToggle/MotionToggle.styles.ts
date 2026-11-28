import { cva } from "@repo/ui/styled-system/css";

/*
 * The "on" look keys on `_motionReduce`, which on the marketing site is the system setting or
 * `data-motion="reduce"` on <html> (panda.config.ts). So the server render and the page before
 * hydration already show the right state, and nothing changes on screen when React takes over.
 */

/** The header's 44px round button, quiet like the theme button beside it. */
export const motionToggleButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    width: "44px",
    height: "44px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    // Without JavaScript the button could do nothing, so it shows only where the head script has
    // run (it marks <html data-theme> before first paint, so script users see no shift).
    "html:not([data-theme]) &": { display: "none" },
    _motionSafe: {
      transitionProperty: "background-color, border-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "text.primary", backgroundColor: "surface.sunken" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    _motionReduce: {
      color: "primary",
      backgroundColor: "surface.card",
      borderColor: "border.strong",
    },
    // The system setting decides: the button shows on and does nothing when pressed.
    "&[aria-disabled='true']": { cursor: "default" },
  },
});
