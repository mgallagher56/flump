import { cva } from "@repo/ui/styled-system/css";

export const chartPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    padding: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const chartHeading = cva({
  base: { margin: 0, textStyle: "heading.sm", color: "text.primary" },
});

export const chartAssumption = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartWrap = cva({
  base: {
    height: "320px",
    width: "100%",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
    "& .recharts-cartesian-axis-tick-value": {
      fill: "text.muted",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-default-tooltip": {
      backgroundColor: "surface.card!",
      borderColor: "border!",
      color: "text.primary!",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-tooltip-label": { color: "text.muted!" },
  },
});

export const chartLegend = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    marginTop: "8px",
    textStyle: "body.sm",
    color: "text.muted",
  },
});

export const chartLegendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "8px" },
});

export const legendSwatch = cva({
  base: { width: "20px", height: "0", borderTopWidth: "3px", flexShrink: 0 },
  variants: {
    kind: {
      contributions: { borderTopStyle: "solid", borderTopColor: "chart.primary" },
      growth: { borderTopStyle: "solid", borderTopColor: "chart.wealth" },
      projection: { borderTopStyle: "dashed", borderTopColor: "chart.projection" },
    },
  },
  defaultVariants: { kind: "projection" },
});

export const dataCell = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
