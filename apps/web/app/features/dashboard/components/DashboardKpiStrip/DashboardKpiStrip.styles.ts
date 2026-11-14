import { cva } from "@repo/ui/styled-system/css";

/** Wraps a KPI figure so it keeps its own `data-figure` hook; tabular like every figure. */
export const kpiFigure = cva({
  base: {
    textStyle: "numeric.kpi",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

/** The prompt under the income figure: a quiet text link that wraps, not a button. */
export const kpiPromptLink = cva({
  base: {
    color: "text.primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _hover: { color: "text.secondary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});
