import { cva } from "../../../styled-system/css";

export const cardRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  variants: {
    /** `default` is the warm `surface.card`; `subtle` and `sunken` sit back for quiet blocks. */
    tone: {
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
      md: { p: { base: "18px", md: "24px" } },
      lg: { p: { base: "20px", md: "32px" } },
    },
  },
  defaultVariants: {
    tone: "default",
    elevation: "resting",
    padding: "md",
  },
});
