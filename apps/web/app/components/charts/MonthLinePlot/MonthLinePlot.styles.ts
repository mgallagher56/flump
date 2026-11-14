import { cva } from "@repo/ui/styled-system/css";

/** The drawing's box: a fixed height so recharts can measure it, every figure in tabular numbers. */
export const chartWrap = cva({
  base: {
    height: { base: "240px", md: "320px" },
    width: "100%",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The end-point label on the chart (SVG text takes a class for its type size). */
export const directLabel = cva({
  base: { fontSize: "sm", fontWeight: "semibold", fontVariantNumeric: "tabular-nums" },
});
