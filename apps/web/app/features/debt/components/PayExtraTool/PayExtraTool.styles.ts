import { css } from "@repo/ui/styled-system/css";

export const controlsStack = css({ display: "flex", flexDirection: "column", gap: "4" });

export const contentStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "5",
  minWidth: 0,
});

export const mutedNote = css({
  margin: "0",
  textStyle: "body.sm",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
});

export const noteLink = css({
  color: "primary",
  textDecoration: "underline",
  fontWeight: "medium",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const leftOverRow = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  textStyle: "body.sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const orderHint = css({ margin: "0", textStyle: "body.sm", color: "text.secondary" });

// Scenario outcome: one figure plus 2 supporting (P1.7). Plain text on the zone surface, never
// the hero surface and no nested card.
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
  fontVariantNumeric: "tabular-nums",
  "& dd": { margin: "0", textStyle: "body.md", color: "text.primary" },
});

export const chartWrap = css({ width: "100%", height: "240px", minWidth: 0 });

export const dataCell = css({ fontVariantNumeric: "tabular-nums" });

/** Direct labels and the payoff annotation drawn inside the chart SVG. */
export const chartLabel = css({ fontSize: "xs" });
