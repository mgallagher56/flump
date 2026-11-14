import { css, cva } from "@repo/ui/styled-system/css";

/** Controls sit on the scenario zone surface: no card chrome (E16 PR 6, no nested cards). */
export const controlsBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const toolHint = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
});

export const scheduleSummary = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const summaryRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "4px 12px",
    fontVariantNumeric: "tabular-nums",
    "& dd": { margin: 0 },
  },
});

export const chartWrap = cva({
  base: {
    height: "300px",
    width: "100%",
    minWidth: 0,
    marginTop: "16px",
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
    fontSize: "xs",
    color: "text.muted",
  },
});

export const chartLegendItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
});

export const legendSwatch = cva({
  base: {
    width: "24px",
    height: "0",
    borderTopWidth: "3px",
    flexShrink: 0,
  },
  variants: {
    kind: {
      standard: { borderTopStyle: "solid", borderTopColor: "chart.debt" },
      overpay: { borderTopStyle: "dashed", borderTopColor: "chart.projection" },
    },
  },
  defaultVariants: { kind: "standard" },
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

export const dataCell = css({
  fontVariantNumeric: "tabular-nums",
});

/** Results column: the outcome first, then two supporting figures and the chart. */
export const outcomeColumn = cva({
  base: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: { base: "12px", md: "16px" },
    fontVariantNumeric: "tabular-nums",
  },
});

export const outcomeLabel = css({
  textStyle: "label.md",
  color: "text.secondary",
  margin: 0,
});

/** Never `surface.hero`: this is a scenario outcome. */
export const outcomeValue = css({
  textStyle: "numeric.lg",
  color: "text.primary",
  margin: 0,
  fontVariantNumeric: "tabular-nums",
});

export const outcomeNote = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
  fontVariantNumeric: "tabular-nums",
});

export const outcomeSupport = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px 24px",
    margin: 0,
  },
});

export const supportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    "& dt": { textStyle: "label.sm", color: "text.muted" },
    "& dd": {
      margin: 0,
      textStyle: "numeric.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const stateNote = css({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  marginTop: "8px",
  fontSize: "xs",
  color: "text.muted",
});
