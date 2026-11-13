import { cva } from "@repo/ui/styled-system/css";

export const taxEstimateNote = cva({
  base: {
    margin: 0,
    fontSize: "xs",
    lineHeight: 1.5,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      default: { color: "text.muted" },
      /** On `surface.hero` or `surface.contrast`. */
      onContrast: { color: "text.onContrast" },
    },
  },
  defaultVariants: { tone: "default" },
});
