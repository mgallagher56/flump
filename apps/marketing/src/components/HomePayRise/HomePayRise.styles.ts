import { css } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const payBand = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });

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
