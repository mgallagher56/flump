import { css, cva } from "@repo/ui/styled-system/css";

export const payCard = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(12, minmax(0, 1fr))" },
  gap: { base: "6", md: "8" },
  alignItems: "start",
});

export const payControls = css({
  gridColumn: { base: "auto", md: "span 5" },
  display: "flex",
  flexDirection: "column",
  gap: "6",
});

export const payOutcome = css({
  gridColumn: { base: "auto", md: "span 7" },
  display: "flex",
  flexDirection: "column",
  gap: "4",
});

export const outcomeLabel = css({ textStyle: "label.md", color: "text.secondary" });

export const outcomeHeadline = css({
  textStyle: "numeric.kpi",
  color: "text.primary",
  margin: "0",
  fontVariantNumeric: "tabular-nums",
});

export const breakdownList = css({ display: "flex", flexDirection: "column", margin: "0" });

export const breakdownRow = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "4",
  paddingY: "2",
  textStyle: "body.sm",
  borderBottomWidth: "1px",
  borderBottomStyle: "solid",
  borderBottomColor: "border.subtle",
});

export const breakdownTerm = css({ color: "text.secondary" });

export const breakdownValue = css({
  margin: "0",
  fontWeight: "semibold",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const taperNote = css({ textStyle: "body.sm", color: "text.secondary", margin: "0" });

export const taperFigure = css({ fontVariantNumeric: "tabular-nums" });

export const payActions = css({ display: "flex", flexWrap: "wrap", gap: "3" });

/** A gliding figure: the exact value for assistive technology, the moving digits hidden (MK10). */
export const glideFigure = css({ fontVariantNumeric: "tabular-nums" });

/** The split bar: one rounded track, its parts in the three keys' colours (prototype 11). */
export const split = css({
  display: "block",
  width: "full",
  height: "12px",
  mt: "0.5",
  mb: "1",
  borderRadius: "full",
  overflow: "hidden",
  backgroundColor: "surface.subtle",
});

/* The three parts: what you keep in the primary colour, tax and National Insurance in greys. */
export const splitPart = cva({
  variants: {
    part: {
      kept: { fill: "chart.primary" },
      tax: { fill: "color-mix(in oklab, token(colors.text.secondary) 60%, transparent)" },
      ni: { fill: "color-mix(in oklab, token(colors.text.secondary) 30%, transparent)" },
    },
  },
});

export const legend = css({
  listStyle: "none",
  margin: 0,
  mb: "1.5",
  padding: 0,
  display: "flex",
  flexWrap: "wrap",
  rowGap: "1",
  columnGap: "3.5",
  textStyle: "label.sm",
  color: "text.secondary",
});

export const legendRow = css({ display: "inline-flex", alignItems: "center", gap: "1.5" });

export const legendKey = cva({
  base: { width: "10px", height: "10px", borderRadius: "xs" },
  variants: {
    part: {
      kept: { backgroundColor: "chart.primary" },
      tax: {
        backgroundColor: "color-mix(in oklab, token(colors.text.secondary) 60%, transparent)",
      },
      ni: { backgroundColor: "color-mix(in oklab, token(colors.text.secondary) 30%, transparent)" },
    },
  },
});
