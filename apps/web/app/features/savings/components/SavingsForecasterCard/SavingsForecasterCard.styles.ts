import { cva } from "@repo/ui/styled-system/css";

export const panel = cva({
  base: {
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
});

export const panelHeading = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});

export const panelSubtitle = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

export const assumption = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const resetRow = cva({
  base: { display: "flex", justifyContent: "flex-end" },
});

export const checkboxLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    textStyle: "body.md",
    color: "text.primary",
    cursor: "pointer",
  },
});

export const checkbox = cva({
  base: { width: "18px", height: "18px", accentColor: "primary.solid", cursor: "pointer" },
});

export const chartWrap = cva({
  base: {
    height: "300px",
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
  base: { width: "20px", height: "0", borderTopWidth: "2px", flexShrink: 0 },
  variants: {
    kind: {
      projection: { borderTopStyle: "dashed", borderTopColor: "chart.primary" },
      contributions: { borderTopStyle: "dashed", borderTopColor: "chart.wealth" },
    },
  },
  defaultVariants: { kind: "projection" },
});

export const dataTable = cva({
  base: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "xs",
    "& caption": { textAlign: "left", color: "text.muted", paddingBottom: "8px" },
    "& th": { textAlign: "left", color: "text.secondary", fontWeight: "semibold" },
    "& th, & td": {
      padding: "4px 8px",
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

export const dataCell = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const milestoneSection = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px" },
});

export const milestoneHeader = cva({
  base: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const goalField = cva({
  base: { width: { base: "100%", sm: "220px" } },
});

export const milestoneGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "12px",
  },
});

export const milestoneCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "12px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.subtle",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    custom: { true: { borderColor: "primary.border", backgroundColor: "primary.subtle" } },
  },
});

export const milestoneTop = cva({
  base: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
});

export const milestoneTime = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});
