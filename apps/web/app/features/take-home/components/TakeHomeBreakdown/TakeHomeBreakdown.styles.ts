import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px" },
});

export const cardHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const cardSubtitle = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

/** One colour per pay part, shared by the bar segment and its table swatch. */
const partColour = {
  incomeTax: { backgroundColor: "chart.series2" },
  nationalInsurance: { backgroundColor: "chart.series3" },
  pension: { backgroundColor: "chart.series4" },
  studentLoan: { backgroundColor: "chart.series5" },
  takeHome: { backgroundColor: "chart.primary" },
} as const;

/** The same colours as SVG fills, for the bar's segments. */
const partFill = {
  incomeTax: { fill: "chart.series2" },
  nationalInsurance: { fill: "chart.series3" },
  pension: { fill: "chart.series4" },
  studentLoan: { fill: "chart.series5" },
  takeHome: { fill: "chart.primary" },
} as const;

export const bar = cva({
  base: {
    display: "block",
    height: "8px",
    width: "100%",
    borderRadius: "full",
    overflow: "hidden",
    backgroundColor: "surface.sunken",
  },
});

export const segment = cva({
  variants: { part: partFill },
});

export const swatch = cva({
  base: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "full",
    flexShrink: 0,
    // Forced colours drop background fills, so outline each swatch to keep it visible.
    "@media (forced-colors: active)": { border: "1px solid CanvasText" },
  },
  variants: { part: partColour },
});

export const partCell = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "8px" },
});

export const barKey = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    marginTop: "-8px",
  },
});
