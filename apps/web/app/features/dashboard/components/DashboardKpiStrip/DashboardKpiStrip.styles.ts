import { cva } from "@repo/ui/styled-system/css";

/** Wraps a KPI figure so it keeps its own `data-figure` hook; tabular like every figure. */
export const kpiFigure = cva({
  base: {
    textStyle: "numeric.kpi",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});
