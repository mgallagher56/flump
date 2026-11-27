import { cva } from "../../../styled-system/css";

// WCAG 2.5.8: every control is at least 24 by 24 CSS px, even where the visible dot is smaller.
// No 44px growth on coarse pointers: six dots and two step buttons must stay on one row at 375.
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
    // One row: dots never wrap (a carousel of more items than fit is the caller's to avoid).
    flexWrap: "nowrap",
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
