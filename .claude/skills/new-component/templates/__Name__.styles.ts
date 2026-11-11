import { cva } from "../../../styled-system/css";

export const __name__Recipe = cva({
  base: {
    bg: "surface.card",
    color: "text.primary",
    borderWidth: "1px",
    borderColor: "border",
    rounded: "md",
    p: "4",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      neutral: { borderColor: "border" },
      positive: {
        bg: "status.positive.bg",
        color: "status.positive.text",
        borderColor: "status.positive.border",
      },
      danger: {
        bg: "status.danger.bg",
        color: "status.danger.text",
        borderColor: "status.danger.border",
      },
    },
  },
  defaultVariants: { tone: "neutral" },
});
