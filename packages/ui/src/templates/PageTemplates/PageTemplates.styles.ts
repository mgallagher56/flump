import { css } from "../../../styled-system/css";

export const page = css({
  display: "flex",
  flexDirection: "column",
  gap: "6",
  width: "100%",
  maxWidth: "1200px",
  marginInline: "auto",
  p: { base: "4", md: "6" },
  backgroundColor: "surface.canvas",
  color: "text.primary",
});

export const stack = css({ display: "flex", flexDirection: "column", gap: "4" });

export const split = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
  gap: "6",
});

export const splitList = css({ gridColumn: { lg: "span 4" } });
export const splitDetail = css({ gridColumn: { lg: "span 8" } });

export const cardTitle = css({
  margin: "0",
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "semibold",
  color: "text.primary",
});

export const cardHeader = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  flexWrap: "wrap",
  mb: "3",
});

export const mutedText = css({ margin: "0", textStyle: "body.sm", color: "text.secondary" });

export const formGrid = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
  gap: "5",
});

export const formFull = css({ gridColumn: { md: "1 / -1" } });

export const buttonRow = css({ display: "flex", flexWrap: "wrap", gap: "3" });

export const centred = css({
  display: "flex",
  justifyContent: "center",
  py: { base: "6", md: "12" },
});

export const listReset = css({
  listStyle: "none",
  margin: "0",
  p: "0",
  display: "flex",
  flexDirection: "column",
  gap: "2",
});

export const listItemButton = css({
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  p: "4",
  textAlign: "left",
  cursor: "pointer",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  backgroundColor: "surface.card",
  color: "text.primary",
  textStyle: "body.md",
  _hover: { backgroundColor: "surface.subtle" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  "&[aria-current='true']": { borderColor: "primary.border", backgroundColor: "primary.subtle" },
});

export const listItemMeta = css({ display: "flex", flexDirection: "column", gap: "1" });

export const figureText = css({ fontVariantNumeric: "tabular-nums", fontWeight: "semibold" });

export const chartSvg = css({ width: "100%", height: "auto", display: "block" });
export const chartGrid = css({ stroke: "chart.grid", strokeWidth: "1" });
export const chartAxisText = css({
  fill: "text.muted",
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
});
export const chartBand = css({ fill: "chart.band" });

const lineBase = {
  fill: "none",
  strokeWidth: "3",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
export const chartLine = css({ ...lineBase, stroke: "chart.primary" });
export const chartWealthLine = css({ ...lineBase, stroke: "chart.wealth" });
export const chartProjectionLine = css({
  ...lineBase,
  stroke: "chart.projection",
  strokeDasharray: "6 6",
});
