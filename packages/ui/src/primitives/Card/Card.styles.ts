import { cva } from "../../../styled-system/css";

export const cardRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    color: "text.primary",
    transitionProperty: "border-color, box-shadow",
    transitionDuration: "base",
    transitionTimingFunction: "standard",
  },
  variants: {
    /** `default` is the warm `surface.card`; `subtle` and `sunken` sit back for quiet blocks. */
    surface: {
      default: {},
      subtle: { backgroundColor: "surface.subtle" },
      sunken: { backgroundColor: "surface.sunken" },
    },
    elevation: {
      none: { boxShadow: "none" },
      resting: { boxShadow: "card" },
      interactive: {
        boxShadow: "card",
        cursor: "pointer",
        _hover: {
          borderColor: "border.strong",
          boxShadow: "cardHover",
        },
      },
      floating: { boxShadow: "floating" },
    },
    padding: {
      none: { p: "0" },
      sm: { p: "12px" },
      md: { p: "density.cardPad" },
      lg: { p: { base: "20px", md: "28px" } },
    },
  },
  defaultVariants: {
    surface: "default",
    elevation: "resting",
    padding: "md",
  },
});
