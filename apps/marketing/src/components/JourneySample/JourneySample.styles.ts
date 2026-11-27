import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The journey's samples: document cards (STYLE-GUIDE 8.3) built from tokens, each showing the
 * sample household's figures a different way. Mint and neutrals only, debt in apricot (MK5, MK6):
 * no violet or rose on any card, chart or label. Figures are tabular.
 */

/** The paper card around a sample. Its own container, so the inner grids follow its width. */
export const sample = css({
  containerType: "inline-size",
  display: "grid",
  gap: "4",
  minWidth: "0",
  margin: "0",
});

export const head = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  flexWrap: "wrap",
  margin: "0",
  textStyle: "label.md",
  color: "text.secondary",
});

export const headFigure = css({
  display: "grid",
  gap: "1",
});

export const bigFigure = css({
  textStyle: "numeric.lg",
  fontVariantNumeric: "tabular-nums",
  color: "text.primary",
  margin: "0",
});

export const caption = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: "0",
});

/* ----- Accounts: six cards dealt into a grid ----- */

export const deck = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "2",
  listStyle: "none",
  margin: "0",
  padding: "0",
  "@container (min-width: 32rem)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
});

export const accountCard = css({
  display: "grid",
  gap: "1",
  padding: "3",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  backgroundColor: "surface.card",
  boxShadow: "xs",
  minWidth: "0",
});

export const accountName = css({
  textStyle: "label.sm",
  color: "text.secondary",
  overflowWrap: "anywhere",
});

export const accountAmount = css({
  textStyle: "numeric.md",
  fontVariantNumeric: "tabular-nums",
  color: "text.primary",
});

export const accountKind = css({
  textStyle: "label.sm",
  fontWeight: "normal",
  color: "text.muted",
});

export const total = css({
  display: "grid",
  gap: "1",
  paddingTop: "3",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
});

export const totalLabel = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  textStyle: "label.md",
  color: "text.secondary",
  margin: "0",
});

/* ----- Budget: what comes in is the bar; each outgoing takes its share ----- */

export const amountRow = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  margin: "0",
  textStyle: "body.sm",
  color: "text.secondary",
  "& strong": {
    textStyle: "numeric.md",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

export const bar = css({
  display: "block",
  width: "100%",
  height: "12px",
  borderRadius: "full",
  overflow: "hidden",
  backgroundColor: "surface.sunken",
});

export const barSegment = cva({
  base: {
    stroke: "surface.card",
    strokeWidth: "0.6",
    transformBox: "fill-box",
    transformOrigin: "left center",
  },
  variants: {
    shade: {
      strong: { fill: "chart.primary" },
      soft: { fill: "chart.primary", fillOpacity: 0.62 },
    },
  },
});

export const barLeftOver = css({
  fill: "chart.band",
});

export const rows = css({
  display: "grid",
  gap: "1",
  listStyle: "none",
  margin: "0",
  padding: "0",
});

export const row = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "3",
  textStyle: "body.sm",
  color: "text.secondary",
  "& > span:last-child": { fontVariantNumeric: "tabular-nums", color: "text.primary" },
});

export const stats = css({
  display: "grid",
  gap: "2",
  paddingTop: "3",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
  "@container (min-width: 28rem)": { gridTemplateColumns: "1fr 1fr" },
});

export const stat = css({
  display: "grid",
  gap: "1",
  margin: "0",
  textStyle: "label.sm",
  fontWeight: "normal",
  color: "text.secondary",
  "& strong": {
    textStyle: "numeric.md",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

/* ----- Pay: the payslip, folded in three, opens out ----- */

export const slip = css({
  display: "grid",
  margin: "0",
  perspective: "900px",
});

export const slipPanel = cva({
  base: {
    display: "grid",
    gap: "2",
    padding: "4",
    backgroundColor: "material.paper.fill",
    borderColor: "material.paper.edge",
    borderStyle: "solid",
    borderLeftWidth: "1px",
    borderRightWidth: "1px",
    backfaceVisibility: "hidden",
  },
  variants: {
    fold: {
      top: {
        borderTopWidth: "1px",
        borderTopRadius: "card",
        transformOrigin: "center bottom",
      },
      middle: {
        borderTopWidth: "1px",
        borderTopStyle: "dashed",
      },
      bottom: {
        borderTopWidth: "1px",
        borderTopStyle: "dashed",
        borderBottomWidth: "1px",
        borderBottomRadius: "card",
        transformOrigin: "center top",
      },
    },
  },
});

export const slipRows = css({
  display: "grid",
  gap: "1",
  margin: "0",
  "& > div": {
    display: "flex",
    justifyContent: "space-between",
    gap: "3",
    textStyle: "body.sm",
    color: "text.secondary",
  },
  "& dt, & dd": { margin: "0" },
  "& dd": { fontVariantNumeric: "tabular-nums", color: "text.primary" },
});

export const slipTitle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  flexWrap: "wrap",
  margin: "0",
  textStyle: "label.md",
  color: "text.primary",
});

export const slipNet = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  margin: "0",
  textStyle: "label.md",
  color: "text.primary",
  "& strong": { textStyle: "numeric.lg", fontVariantNumeric: "tabular-nums" },
});

/* ----- Savings and debt: a line chart that draws itself ----- */

export const chart = css({
  display: "grid",
  gap: "2",
});

export const chartSvg = css({
  display: "block",
  width: "100%",
  height: "auto",
  overflow: "visible",
});

export const chartGrid = css({
  stroke: "chart.grid",
  strokeWidth: "1",
});

export const chartBase = css({
  stroke: "chart.baseline",
  strokeWidth: "1",
});

export const chartLine = cva({
  base: { fill: "none", strokeWidth: "2.5", strokeLinejoin: "round", strokeLinecap: "round" },
  variants: {
    tone: {
      wealth: { stroke: "chart.wealth" },
      debt: { stroke: "chart.debt" },
    },
  },
});

export const chartArea = cva({
  base: { stroke: "none", fillOpacity: 0.12 },
  variants: {
    tone: {
      wealth: { fill: "chart.wealth" },
      debt: { fill: "chart.debt" },
    },
  },
});

export const chartMarker = cva({
  base: { stroke: "surface.card", strokeWidth: "3" },
  variants: {
    tone: {
      wealth: { fill: "chart.wealth" },
      debt: { fill: "chart.debt" },
    },
  },
});

export const ticks = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "2",
  listStyle: "none",
  margin: "0",
  padding: "0",
  textStyle: "label.sm",
  fontWeight: "normal",
  fontVariantNumeric: "tabular-nums",
  color: "text.muted",
});

export const facts = css({
  display: "grid",
  gap: "2",
  margin: "0",
  "@container (min-width: 28rem)": { gridTemplateColumns: "1fr 1fr" },
  "& > div": { display: "grid", gap: "1" },
  "& dt": { textStyle: "label.sm", fontWeight: "normal", color: "text.secondary" },
  "& dd": {
    margin: "0",
    textStyle: "label.md",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

/* ----- The picture: the Home page's three figures ----- */

export const tiles = css({
  display: "grid",
  gap: "2",
  "@container (min-width: 30rem)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
});

export const tile = cva({
  base: {
    display: "grid",
    gap: "1",
    padding: "4",
    margin: "0",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
  variants: {
    lead: {
      true: {
        backgroundColor: "surface.sunken",
        "@container (min-width: 30rem)": { gridColumn: "1 / -1" },
      },
      false: {},
    },
  },
});

export const tileLabel = css({
  textStyle: "label.sm",
  fontWeight: "normal",
  color: "text.secondary",
});

export const tileFigure = cva({
  base: { fontVariantNumeric: "tabular-nums", color: "text.primary" },
  variants: {
    lead: { true: { textStyle: "numeric.kpi" }, false: { textStyle: "numeric.md" } },
  },
});
