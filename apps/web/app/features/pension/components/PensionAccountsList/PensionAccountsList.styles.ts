import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const listTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const listMeta = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.muted",
    margin: "4px 0 0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const allocationPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});

export const allocationHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "4px 12px",
    textStyle: "label.md",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const allocationBar = cva({
  base: {
    display: "block",
    height: "10px",
    width: "100%",
    borderRadius: "full",
    backgroundColor: "border.subtle",
    overflow: "hidden",
  },
});

/** Pot colours: the series tokens, always paired with the pot name in the legend. */
export const potFill = cva({
  base: {},
  variants: {
    tone: {
      0: { fill: "chart.series1" },
      1: { fill: "chart.series2" },
      2: { fill: "chart.series3" },
      3: { fill: "chart.series4" },
      4: { fill: "chart.series5" },
      5: { fill: "chart.series6" },
      6: { fill: "chart.series7" },
      7: { fill: "chart.series8" },
    },
  },
});

export const potDot = cva({
  base: {
    width: "10px",
    height: "10px",
    borderRadius: "full",
    display: "inline-block",
    flexShrink: 0,
  },
  variants: {
    tone: {
      0: { backgroundColor: "chart.series1" },
      1: { backgroundColor: "chart.series2" },
      2: { backgroundColor: "chart.series3" },
      3: { backgroundColor: "chart.series4" },
      4: { backgroundColor: "chart.series5" },
      5: { backgroundColor: "chart.series6" },
      6: { backgroundColor: "chart.series7" },
      7: { backgroundColor: "chart.series8" },
    },
  },
});

export const allocationLegend = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});

export const allocationLegendItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const allocationNote = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "10px", minWidth: "200px" },
});

export const accountLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    textStyle: "label.md",
    color: "text.primary",
    textAlign: "left",
    _hover: { color: "primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});

export const mutedFigure = cva({
  base: { color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const actionsCell = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const drawerWrap = cva({ base: { marginTop: "4px" } });

export const mobileList = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px" },
});

export const mobileCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.subtle",
  },
});

export const mobileTop = cva({
  base: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
});

export const mobileIdentity = cva({
  base: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" },
});

export const mobileFigures = cva({
  base: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" },
});

export const mobileFigure = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const mobileFigureLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const mobileActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const layoutMobile = cva({
  base: { display: { base: "block", md: "none" } },
});

export const layoutDesktop = cva({
  base: { display: { base: "none", md: "block" }, minWidth: 0 },
});
