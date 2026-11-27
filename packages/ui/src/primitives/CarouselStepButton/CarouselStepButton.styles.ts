import { cva } from "../../../styled-system/css";

// WCAG 2.5.8: at least 24 by 24 CSS px. No 44px growth on coarse pointers, so previous, six dots
// and next stay on one row at 375.
const MIN_TARGET = "24px";

const focusRing = {
  outline: "2px solid",
  outlineColor: "border.focusRing",
  outlineOffset: "2px",
} as const;

/** Previous and next: real buttons with a chevron, at least 24px square. */
export const carouselStepButtonRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
    minWidth: MIN_TARGET,
    minHeight: MIN_TARGET,
    p: "6px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    color: "text.primary",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "border-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    "@media (hover: hover)": {
      _hover: { borderColor: "primary.border", color: "primary" },
    },
    _focusVisible: focusRing,
    // At an end without `loop`: still focusable (so the keyboard order never shifts), but quiet.
    "&[aria-disabled=true]": {
      color: "text.muted",
      borderColor: "border.subtle",
      cursor: "not-allowed",
      "@media (hover: hover)": {
        _hover: { borderColor: "border.subtle", color: "text.muted" },
      },
      // Forced colours replace the colours above with the system pair, so a disabled button would
      // look enabled: use the system disabled colour for its icon and border.
      _highContrast: { color: "GrayText", borderColor: "GrayText" },
    },
  },
});
