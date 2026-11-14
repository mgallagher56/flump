import { cva } from "@repo/ui/styled-system/css";

/**
 * The figure and its data row, spaced like the figure's own parts. Every figure and month in the
 * summary, label and table lines up (tabular-nums).
 */
export const chartStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
