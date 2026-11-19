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

/** The payoff order tabs with the InfoTip that explains the selected order beside them. */
export const orderRow = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });

export const chartWrap = css({ width: "100%", height: "240px", minWidth: 0 });

export const dataCell = css({ fontVariantNumeric: "tabular-nums" });

/** Direct labels and the payoff annotation drawn inside the chart SVG. */
export const chartLabel = css({ fontSize: "xs" });
