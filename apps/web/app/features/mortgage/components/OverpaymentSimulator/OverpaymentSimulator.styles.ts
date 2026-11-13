import { css, cva } from "@repo/ui/styled-system/css";

export const controlsCard = cva({
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

export const resultsCard = cva({
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

export const cardHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const cardSubtitle = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
});

export const resultsHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const resultsHeaderText = css({
  minWidth: 0,
});

export const scheduleSummary = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingTop: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    fontSize: "xs",
    color: "text.muted",
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

/** Results column: headline outcome first, then the KPI strip, chart and caveat (Direction C). */
export const outcomeColumn = cva({
  base: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: { base: "12px", md: "16px" },
  },
});

export const heroEyebrow = cva({
  base: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "sm",
    fontWeight: "semibold",
    color: "primary",
  },
});

/** Larger padding and headline than a strip card. Never `surface.hero`: this is a scenario outcome. */
export const heroCard = css({
  padding: { base: "20px", md: "28px" },
  borderRadius: "2xl",
});

export const heroValue = css({
  display: "block",
  fontSize: { base: "2xl", md: "3xl" },
  lineHeight: "tight",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
});

export const projectionChip = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    paddingInline: "10px",
    paddingBlock: "2px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.secondary",
  },
});

export const stateNote = css({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  marginTop: "8px",
  fontSize: "xs",
  color: "text.muted",
});

/** Early repayment charge caveat (L-02), an info callout under the results. */
export const ercCallout = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.info.border",
    backgroundColor: "status.info.bg",
    color: "status.info.text",
    fontSize: "sm",
    "& p": { margin: 0 },
    "& svg": { flexShrink: 0, marginTop: "2px" },
  },
});
