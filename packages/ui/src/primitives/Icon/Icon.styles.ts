import { cva } from "../../../styled-system/css";

/** Pixel sizes for the `size` prop. Mirrors the 16/20/24 icon grid. */
export const iconSizePx = { sm: 16, md: 20, lg: 24 } as const;

/** Default stroke width (design token for the Lucide set: slightly lighter than Lucide's 2). */
export const ICON_STROKE_WIDTH = 1.75;

export const iconRecipe = cva({
  base: {
    display: "inline-block",
    flexShrink: 0,
    color: "currentColor",
    verticalAlign: "middle",
  },
  variants: {
    size: {
      sm: { width: "16px", height: "16px" },
      md: { width: "20px", height: "20px" },
      lg: { width: "24px", height: "24px" },
    },
  },
  defaultVariants: { size: "md" },
});
