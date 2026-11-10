import { cva } from "../../../styled-system/css";

export const cardRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  variants: {
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
      md: { p: { base: "16px", md: "20px" } },
      lg: { p: { base: "20px", md: "28px" } },
    },
  },
  defaultVariants: {
    elevation: "resting",
    padding: "md",
  },
});
