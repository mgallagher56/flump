import { css, cva } from "../../../styled-system/css";

/** Page frame: a readable column on the sand canvas. */
export const signoffRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8",
    width: "100%",
    maxWidth: "1120px",
    marginInline: "auto",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const signoffSection = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const signoffSectionTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const signoffSectionNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const signoffTwoColumn = cva({
  base: {
    display: "grid",
    gap: "6",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "repeat(12, minmax(0, 1fr))" },
    alignItems: "start",
  },
});

export const signoffWide = cva({
  base: { gridColumn: { base: "auto", lg: "span 7" }, minWidth: 0 },
});

export const signoffNarrow = cva({
  base: { gridColumn: { base: "auto", lg: "span 5" }, minWidth: 0 },
});

export const signoffPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    p: { base: "4", md: "6" },
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    boxShadow: "card",
  },
});

export const signoffPanelTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

/** The one deep-teal hero block per page, holding the headline figure. */
export const heroBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    p: { base: "6", md: "8" },
    backgroundColor: "surface.hero",
    color: "text.onContrast",
    borderRadius: "2xl",
  },
});

export const heroTop = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const heroLabel = cva({
  base: { textStyle: "label.md", color: "text.onContrast", margin: 0 },
});

export const heroSample = cva({
  base: {
    textStyle: "label.sm",
    color: "text.onContrast",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "text.onContrast",
    borderRadius: "full",
    px: "3",
    py: "1",
  },
});

export const heroFigure = cva({
  base: {
    textStyle: "display",
    color: "text.onContrast",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const heroDelta = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    textStyle: "body.md",
    color: "text.onContrast",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartWrap = cva({
  base: { width: "100%" },
});

export const chartSvg = css({ width: "100%", height: "auto", display: "block" });

export const chartGridLine = css({ stroke: "chart.grid", strokeWidth: "1" });

const line = {
  strokeWidth: "3",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const chartAssets = css({ ...line, stroke: "chart.primary" });
export const chartDebt = css({ ...line, stroke: "chart.debt" });
export const chartWealth = css({ ...line, stroke: "chart.wealth" });
export const chartProjection = css({ ...line, stroke: "chart.projection", strokeDasharray: "6 6" });
export const chartBand = css({ fill: "chart.band" });

export const chartAxisText = css({
  fill: "text.muted",
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
});

export const legendList = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4",
    listStyle: "none",
    margin: 0,
    padding: 0,
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const legendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "2" },
});

export const legendSwatch = cva({
  base: { display: "inline-block", width: "16px", height: "4px", borderRadius: "full" },
  variants: {
    series: {
      assets: { backgroundColor: "chart.primary" },
      debt: { backgroundColor: "chart.debt" },
      wealth: { backgroundColor: "chart.wealth" },
      projection: { backgroundColor: "chart.projection" },
    },
  },
});

export const badgeRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3", alignItems: "center" },
});

export const tableCellSub = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted" },
});

export const tableCellText = cva({
  base: { color: "text.primary", fontWeight: "medium" },
});

/** The change column is dropped at phone width so the compact table fits its panel. */
export const hideNarrow = cva({
  base: { display: { base: "none", sm: "table-cell" } },
});

export const emptyWrap = cva({
  base: { maxWidth: "560px" },
});

/** Illustration colours come from semantic tokens only. */
export const illustrationRoot = css({ width: "100%", maxWidth: "240px", height: "auto" });
export const illSand = css({ fill: "surface.sunken" });
export const illApricot = css({ fill: "chart.debt" });
export const illSage = css({ fill: "chart.wealth" });
export const illTealSoft = css({ fill: "primary.border" });
export const illTeal = css({ fill: "primary.solid" });
export const illLeaf = css({ fill: "primary" });
export const illDots = css({
  stroke: "text.muted",
  fill: "none",
  strokeWidth: "3",
  strokeLinecap: "round",
  strokeDasharray: "1 9",
});
export const illStem = css({
  stroke: "chart.wealth",
  fill: "none",
  strokeWidth: "4",
  strokeLinecap: "round",
});
