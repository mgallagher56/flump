import { cva } from "../../../styled-system/css";
import { textColorVariants } from "../Text/Text.styles";

export const headingRecipe = cva({
  base: { margin: 0, textWrap: "balance" },
  variants: {
    size: {
      display: { textStyle: "display" },
      xl: { textStyle: "heading.xl" },
      lg: { textStyle: "heading.lg" },
      md: { textStyle: "heading.md" },
      sm: { textStyle: "heading.sm" },
    },
    color: textColorVariants,
    tabular: { true: { fontVariantNumeric: "tabular-nums" } },
  },
  defaultVariants: { size: "lg", color: "primary" },
});
