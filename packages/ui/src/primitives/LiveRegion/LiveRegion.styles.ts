import { cva } from "../../../styled-system/css";

// Only applied when the region is visible; the hidden variant uses VisuallyHidden.
export const liveRegionRecipe = cva({
  base: {
    color: "text.secondary",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
});
