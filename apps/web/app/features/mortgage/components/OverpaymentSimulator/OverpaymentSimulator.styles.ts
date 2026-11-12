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

export const durationValue = css({
  fontVariantNumeric: "tabular-nums",
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
    width: "20px",
    height: "0",
    borderTopWidth: "2px",
    flexShrink: 0,
  },
  variants: {
    kind: {
      standard: { borderTopStyle: "solid", borderTopColor: "chart.debt" },
      overpay: { borderTopStyle: "dashed", borderTopColor: "chart.wealth" },
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
