import { cva } from "../../../styled-system/css";

export const themeToggleGroup = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    margin: "0",
    minWidth: "0",
    // Room for the 2px focus ring + 2px offset on the 44px options below md.
    padding: { base: "4px", md: "2px" },
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.sunken",
  },
});

export const themeToggleOption = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // 44px hit area on small screens (WCAG 2.5.5/2.5.8, audit R-17); compact 32px from md up.
    width: { base: "44px", md: "32px" },
    height: { base: "44px", md: "32px" },
    borderRadius: "full",
    border: "none",
    backgroundColor: "transparent",
    color: "text.muted",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "&[aria-pressed='true']": {
      backgroundColor: "surface.card",
      color: "primary",
      boxShadow: "xs",
    },
    // Keeps 44px on touch devices at any width, including md and up (tablets).
    "@media (pointer: coarse)": {
      width: "44px",
      height: "44px",
    },
  },
});

/** The one-button `cycle` variant: a 44px round button at every width (a touch target first). */
export const themeToggleCycle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    width: "44px",
    height: "44px",
    // Quiet like the ghost menu button beside it: no fill until hovered.
    borderRadius: "full",
    borderWidth: "0",
    backgroundColor: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "text.primary", backgroundColor: "surface.sunken" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
