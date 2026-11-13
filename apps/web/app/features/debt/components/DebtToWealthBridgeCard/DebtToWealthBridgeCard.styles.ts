import { css, cva } from "@repo/ui/styled-system/css";

export const bridgeCard = cva({
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

export const bridgeHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px 24px",
  },
});

export const bridgeHeaderText = css({ minWidth: 0, flex: "1 1 280px" });

export const cardHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const cardSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const rateControl = css({ flex: "0 1 220px", minWidth: 0 });

export const nativeSelect = cva({
  base: {
    width: "100%",
    minHeight: "44px",
    paddingX: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    fontVariantNumeric: "tabular-nums",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
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

export const textValue = css({
  fontSize: { base: "lg", md: "xl" },
  fontWeight: "bold",
  lineHeight: "tight",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
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
  base: { display: "inline-flex", alignItems: "center", gap: "8px" },
});

export const legendSwatch = cva({
  base: { width: "24px", height: "0", borderTopWidth: "3px", flexShrink: 0 },
  variants: {
    kind: {
      debt: { borderTopStyle: "solid", borderTopColor: "chart.debt" },
      wealth: { borderTopStyle: "dashed", borderTopColor: "chart.wealth" },
    },
  },
  defaultVariants: { kind: "debt" },
});

export const chartWrap = cva({
  base: {
    height: "280px",
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

export const dataCell = css({ fontVariantNumeric: "tabular-nums" });

export const stateNote = css({
  margin: 0,
  marginTop: "8px",
  fontSize: "xs",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
});
