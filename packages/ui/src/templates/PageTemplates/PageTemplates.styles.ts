import { css } from "../../../styled-system/css";

/** The canvas and `main` landmark a template renders on; `PageBody` inside it sets the layout. */
export const page = css({
  width: "100%",
  minHeight: "100%",
  pb: "10",
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
  textStyle: "heading.sm",
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

// "Your details": the saved facts, one figure per row (P1.4).
export const detailsList = css({ listStyle: "none", margin: "0", p: "0" });

export const detailsRow = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  py: "3",
  textStyle: "body.md",
  color: "text.primary",
  "&:not(:last-child)": {
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

// Scenario outcome: one figure plus at most 2 supporting (P1.7). Plain text on the zone surface,
// never the hero surface and no nested card.
export const outcome = css({ display: "flex", flexDirection: "column", gap: "1" });
export const outcomeLabel = css({ margin: "0", textStyle: "body.sm", color: "text.secondary" });
export const outcomeValue = css({
  margin: "0",
  textStyle: "numeric.kpi",
  fontVariantNumeric: "tabular-nums",
  color: "text.primary",
});
export const outcomeSupport = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "6",
  margin: "0",
  mt: "2",
});
export const outcomeSupportItem = css({
  display: "flex",
  flexDirection: "column",
  gap: "0.5",
  textStyle: "body.sm",
  color: "text.secondary",
  "& dd": { margin: "0", textStyle: "body.md", color: "text.primary" },
});

export const toolStack = css({ display: "flex", flexDirection: "column", gap: "4", pt: "4" });

export const plainLink = css({
  color: "primary",
  textDecoration: "underline",
  fontWeight: "medium",
  textStyle: "body.sm",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const proseText = css({
  margin: "0",
  maxWidth: "65ch",
  textStyle: "body.md",
  color: "text.secondary",
});

export const listItemMeta = css({ display: "flex", flexDirection: "column", gap: "1" });
/** The account name leads the row: body size in primary text, above the smaller secondary type. */
export const listItemName = css({ textStyle: "body.md", color: "text.primary" });

export const figureText = css({ fontVariantNumeric: "tabular-nums", fontWeight: "semibold" });

export const chartSvg = css({ width: "100%", height: "auto", display: "block" });
export const chartGrid = css({ stroke: "chart.grid", strokeWidth: "1" });
/** Axis ticks at the label size; the chart draws one SVG unit per CSS pixel, so it holds. */
export const chartAxisText = css({
  fill: "text.muted",
  textStyle: "label.md",
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

// PageBody (plan P13): the only page wrapper. Values come from the PR 1 page tokens.
export const pageBody = css({
  display: "flex",
  flexDirection: "column",
  gap: "page.section",
  width: "100%",
  maxWidth: "page.max",
  marginInline: "auto",
  px: { base: "page.gutter.sm", md: "page.gutter.md", lg: "page.gutter.lg" },
  pt: { base: "page.top.sm", lg: "page.top.lg" },
  color: "text.primary",
  // Inside a shell that already pads its content, only the difference to the P13 tokens is added,
  // so gutters and top space apply exactly once (see the PageBody JSDoc). The two values never
  // match the same element, so neither rule depends on CSS order.
  // AppShell's main (`data-page-shell=""`) pads with exactly the P13 values: add nothing.
  '[data-page-shell=""] &': { px: "0", pt: "0" },
  // apps/web root main (`data-page-shell="web"`): its wrapper pads 12px (24px from md) at the
  // sides and the main pads 16px (24px from md) on top. Add the rest: 16/24/40 sides and 20/32
  // top. From md to lg the shell's 24px top is 4px more than P13's 20px, taken back by margin.
  '[data-page-shell="web"] &': {
    px: { base: "1", md: "0", lg: "4" },
    pt: { base: "1", md: "0", lg: "2" },
    mt: { base: "0", md: "-1", lg: "0" },
  },
});

// PageSkeleton (plan P12.1): header, hero block, 3 KPI cards, 2 cards.
export const pageSkeletonHeader = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  maxWidth: "480px",
});

export const pageSkeletonHero = css({ borderRadius: "card" });

export const pageSkeletonKpis = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(3, minmax(0, 1fr))" },
  gap: "4",
});

export const pageSkeletonCard = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  p: "5",
  borderRadius: "card",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
  boxShadow: "card",
});
