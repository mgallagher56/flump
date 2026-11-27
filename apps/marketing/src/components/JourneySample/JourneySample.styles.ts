import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The journey's samples at prototype 11's size and styling (`p11-v-*` in `stops/stops.css`): glass
 * panels holding the sample household's figures, each tagged "Example". Mint and neutrals only,
 * debt in the debt colour (MK5, MK6): no violet or rose on any panel, chart or label. Figures are
 * tabular. The panel is its own container, so its inner grids follow its width.
 */

/** The glass panel (`p11-v-panel`): a 24px card with a faint sheen. */
export const panel = css({
  position: "relative",
  containerType: "inline-size",
  minWidth: "0",
  margin: "0",
  padding: { base: "16px", md: "22px", xl: "28px" },
  borderRadius: { base: "20px", md: "24px" },
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "material.glass.border",
  backgroundColor: "material.glass.fill",
  backgroundImage: "linear-gradient(155deg, token(colors.material.glass.sheen), transparent 45%)",
  boxShadow: "card",
  color: "text.primary",
  "& p, & dl, & dd, & figure": { margin: "0" },
});

/** A label with its "Example" tag beside it. */
export const tagged = css({
  display: "inline-flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "2",
});

/* ----- Budget: the bar, the outgoings, left over and breathing room ----- */

export const budget = css({
  display: "grid",
  gap: { base: "10px", md: "4" },
});

export const budgetIn = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "4px 12px",
  color: "text.secondary",
  fontSize: "md",
  "& strong": {
    color: "text.primary",
    fontSize: "2xl",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
  },
});

export const bar = css({
  display: "block",
  width: "100%",
  height: { base: "40px", md: "48px", lg: "56px" },
  borderRadius: "14px",
  backgroundColor: "color-mix(in oklab, {colors.text.primary} 7%, transparent)",
  overflow: "hidden",
});

/** Each outgoing's shade: mint, a little deeper with each one (prototype 11's mix). */
const SHADES = {
  0: "color-mix(in oklab, {colors.primary} 100%, {colors.text.primary} 0%)",
  1: "color-mix(in oklab, {colors.primary} 88%, {colors.text.primary} 4%)",
  2: "color-mix(in oklab, {colors.primary} 76%, {colors.text.primary} 8%)",
  3: "color-mix(in oklab, {colors.primary} 64%, {colors.text.primary} 12%)",
  4: "color-mix(in oklab, {colors.primary} 52%, {colors.text.primary} 16%)",
  5: "color-mix(in oklab, {colors.primary} 40%, {colors.text.primary} 20%)",
} as const;

export type BudgetShade = keyof typeof SHADES;

export const barSegment = cva({
  base: { transformBox: "fill-box", transformOrigin: "left center" },
  variants: {
    shade: {
      0: { fill: SHADES[0] },
      1: { fill: SHADES[1] },
      2: { fill: SHADES[2] },
      3: { fill: SHADES[3] },
      4: { fill: SHADES[4] },
      5: { fill: SHADES[5] },
    },
  },
});

/** What is left over: the space that remains, outlined in mint. */
export const barLeftOver = css({
  fill: "none",
  stroke: "primary",
  strokeWidth: "1.5",
  strokeDasharray: "5 4",
  transformBox: "fill-box",
  transformOrigin: "left center",
});

export const rows = css({
  listStyle: "none",
  margin: "0",
  padding: "0",
  display: "grid",
  gap: { base: "3px 16px", md: "6px 24px" },
  "@container (min-width: 26rem)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
});

export const row = css({
  display: "grid",
  gridTemplateColumns: "12px 1fr auto",
  alignItems: "center",
  gap: "10px",
  fontSize: { base: "sm", md: "md" },
  "& > :last-child": { fontVariantNumeric: "tabular-nums" },
});

export const swatch = cva({
  base: { width: "12px", height: "12px", borderRadius: "3px" },
  variants: {
    shade: {
      0: { backgroundColor: SHADES[0] },
      1: { backgroundColor: SHADES[1] },
      2: { backgroundColor: SHADES[2] },
      3: { backgroundColor: SHADES[3] },
      4: { backgroundColor: SHADES[4] },
      5: { backgroundColor: SHADES[5] },
    },
  },
});

export const foot = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "3",
  paddingTop: "14px",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border",
});

export const stat = css({
  display: "grid",
  gap: "2px",
  color: "text.secondary",
  fontSize: "sm",
  "& strong": {
    color: "text.primary",
    fontSize: { base: "2xl", lg: "3xl" },
    fontWeight: "bold",
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
});

/* ----- Charts: savings and debt ----- */

export const graph = css({
  display: "grid",
  gap: "14px",
});

export const graphHead = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "4px 16px",
});

export const graphTitle = css({
  color: "text.secondary",
  fontSize: "md",
});

export const graphFigure = cva({
  base: { color: "text.primary", fontWeight: "bold", letterSpacing: "-0.02em" },
  variants: {
    /**
     * An area page's set piece: the larger figure from 48rem, as the approved area prototypes
     * (prototype 11's clamp, about 37px at 1000px), so a narrow panel stacks the title above it.
     */
    setPiece: {
      false: { fontSize: { base: "3xl", lg: "4xl" } },
      true: { fontSize: { base: "3xl", md: "4xl" } },
    },
  },
  defaultVariants: { setPiece: false },
});

export const graphNote = css({
  color: "text.secondary",
  fontSize: "sm",
  lineHeight: "1.5",
});

export const graphFacts = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "3",
  paddingTop: "3",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border",
  "& dt": { color: "text.secondary", fontSize: "xs" },
  "& dd": { fontSize: "lg", fontWeight: "bold", fontVariantNumeric: "tabular-nums" },
});

/* ----- The picture: the Home page's three figures ----- */

export const dash = css({
  display: "grid",
  gap: "14px",
});

export const dashHead = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "lg",
  fontWeight: "bold",
});

export const dashTiles = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
});

export const dashTile = cva({
  base: {
    display: "grid",
    gap: "1",
    padding: "14px 16px",
    borderRadius: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.subtle",
  },
  variants: {
    lead: {
      // The headline figure: the hero block, with prototype 11's two washes (`p11-v-dash__tile--hero`):
      // sky at the top right and violet at the foot.
      true: {
        gridColumn: "1 / -1",
        backgroundColor: "surface.hero",
        borderColor: "border.hero",
        backgroundImage:
          "radial-gradient(circle at 88% 20%, color-mix(in oklab, {colors.chart.series6} 22%, transparent), transparent 50%), radial-gradient(circle at 70% 110%, color-mix(in oklab, {colors.chart.series4} 18%, transparent), transparent 50%)",
      },
      false: {},
    },
  },
});

export const dashLabel = cva({
  base: { fontSize: "sm" },
  variants: {
    lead: { true: { color: "text.onHero" }, false: { color: "text.secondary" } },
  },
});

export const dashFigure = cva({
  base: { fontWeight: "bold", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  variants: {
    lead: {
      true: { color: "text.heroFigure", fontSize: { base: "4xl", lg: "5xl" } },
      false: { color: "text.primary", fontSize: { base: "2xl", lg: "3xl" } },
    },
  },
});
