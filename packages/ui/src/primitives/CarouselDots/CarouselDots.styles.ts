import { cva } from "../../../styled-system/css";

// WCAG 2.5.8: every control is at least 24 by 24 CSS px, even where the visible dot is smaller.
// On a coarse pointer the hit area grows to the 44px touch size.
const MIN_TARGET = "24px";

const focusRing = {
  outline: "2px solid",
  outlineColor: "border.focusRing",
  outlineOffset: "2px",
} as const;

export const carouselDotsRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
  },
});

export const carouselDotsGroupRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0",
  },
});

/** The hit area: a plain button, transparent, at least 24px square. */
export const carouselDotButtonRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: MIN_TARGET,
    minHeight: MIN_TARGET,
    p: "0",
    borderWidth: "0",
    borderRadius: "full",
    backgroundColor: "transparent",
    cursor: "pointer",
    "@media (pointer: coarse)": { minWidth: "touch", minHeight: "touch" },
    _focusVisible: focusRing,
  },
});

/**
 * The visible dot. Other items: a small ring. The current item: a longer filled pill, so it
 * differs by shape and fill as well as colour, and keeps its shape in forced colours.
 */
export const carouselDotRecipe = cva({
  base: {
    display: "block",
    height: "8px",
    width: "8px",
    borderRadius: "full",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "transparent",
    _motionSafe: {
      transitionProperty: "width, background-color, border-color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    "@media (hover: hover)": {
      "button:hover > &": { borderColor: "primary" },
    },
  },
  variants: {
    current: {
      true: {
        width: "20px",
        borderColor: "primary",
        // A graphic-only fill with no text on it: `chart.primary` is the same mint as `primary`
        // and is the sanctioned token for such fills (AGENTS.md section 2).
        backgroundColor: "chart.primary",
      },
      false: {},
    },
  },
  defaultVariants: { current: false },
});

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
    "@media (pointer: coarse)": { minWidth: "touch", minHeight: "touch" },
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
    },
  },
});
