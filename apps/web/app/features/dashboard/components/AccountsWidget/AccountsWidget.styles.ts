import { cva } from "@repo/ui/styled-system/css";

export const allocation = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const barFrame = cva({
  base: {
    display: "block",
    height: "8px",
    borderRadius: "full",
    overflow: "hidden",
    backgroundColor: "surface.sunken",
  },
});

export const barSvg = cva({
  base: { display: "block", width: "100%", height: "100%" },
});

export const segmentFill = cva({
  variants: {
    series: {
      1: { fill: "chart.series1" },
      2: { fill: "chart.series2" },
      3: { fill: "chart.series3" },
      4: { fill: "chart.series4" },
      5: { fill: "chart.series5" },
    },
  },
});

export const legend = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px 12px",
    listStyle: "none",
    margin: 0,
    padding: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const legendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "6px" },
});

export const swatch = cva({
  base: { width: "8px", height: "8px", borderRadius: "full", flexShrink: 0 },
  variants: {
    series: {
      1: { backgroundColor: "chart.series1" },
      2: { backgroundColor: "chart.series2" },
      3: { backgroundColor: "chart.series3" },
      4: { backgroundColor: "chart.series4" },
      5: { backgroundColor: "chart.series5" },
    },
  },
});
