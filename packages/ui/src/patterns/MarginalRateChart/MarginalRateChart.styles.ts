import { cva } from "../../../styled-system/css";

/**
 * The figure. ChartFigure's own title style sets no word spacing, so at 600 weight the title's
 * words ran together ("deductedfromthe"). The heading textStyle carries the heading word spacing
 * from the tokens. (The lasting fix belongs in ChartFigure's title style.)
 */
export const marginalRateFigure = cva({
  base: {
    // The global heading style balances lines (text-wrap: balance), which split a title that
    // nearly fits into two half lines; wrap normally so it keeps one line when it fits.
    "& > figcaption > :is(h2, h3, h4)": { textStyle: "heading.sm", textWrap: "wrap" },
  },
});

/** Labels drawn on the chart itself, in place of a legend (P10.2). */
export const marginalRateDirectLabel = cva({
  base: { fill: "text.secondary", fontSize: "xs", fontWeight: "semibold" },
  variants: {
    tone: { line: { fill: "text.primary" }, muted: {} },
  },
  defaultVariants: { tone: "muted" },
});

export const marginalRateNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const marginalRateSvg = cva({
  base: { width: "100%", height: "auto", display: "block", overflow: "visible" },
});

export const marginalRateGrid = cva({
  base: { stroke: "chart.grid", strokeWidth: "1" },
});

export const marginalRateAxisText = cva({
  base: { fill: "text.muted", fontSize: "xs", fontVariantNumeric: "tabular-nums" },
});

export const marginalRateAxisTitle = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: "0" },
  variants: {
    position: { start: { textAlign: "start" }, end: { textAlign: "end" } },
  },
  defaultVariants: { position: "start" },
});

export const marginalRateChartArea = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", width: "100%", minWidth: "0" },
});

/** Fills the tooltip's foreignObject and lines the box up with its marker. */
export const marginalRateTooltipFrame = cva({
  base: { display: "flex", width: "100%", pointerEvents: "none" },
  variants: {
    align: {
      start: { justifyContent: "flex-start" },
      center: { justifyContent: "center" },
      end: { justifyContent: "flex-end" },
    },
  },
  defaultVariants: { align: "center" },
});

export const marginalRateTooltip = cva({
  base: {
    paddingBlock: "1.5",
    paddingInline: "2.5",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.overlay",
    color: "text.primary",
    boxShadow: "overlay",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const marginalRateBand = cva({
  base: { fill: "chart.band" },
});

export const marginalRateLine = cva({
  base: {
    fill: "none",
    stroke: "chart.primary",
    strokeWidth: "2.5",
    strokeLinejoin: "round",
    strokeLinecap: "round",
  },
});

export const marginalRateThreshold = cva({
  base: { stroke: "chart.baseline", strokeWidth: "1.5", strokeDasharray: "4 4" },
  variants: {
    active: { true: { strokeWidth: "2.5" }, false: {} },
  },
  defaultVariants: { active: false },
});

export const marginalRateThresholdHandle = cva({
  base: { fill: "surface.card", stroke: "chart.baseline", strokeWidth: "2" },
});

/** Transparent hover and focus target filling its foreignObject over a threshold line. */
export const marginalRateHitArea = cva({
  base: {
    display: "block",
    width: "100%",
    height: "100%",
    padding: "0",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing" },
  },
});

/** "Your pay": a solid neutral line, so the page gains no new hue (the curve is the one teal). */
export const marginalRateYourPay = cva({
  base: { stroke: "text.secondary", strokeWidth: "2.5" },
});

export const marginalRateYourPayText = cva({
  base: { fill: "text.primary", fontSize: "xs", fontWeight: "bold" },
});

export const marginalRateYourPayDot = cva({
  base: { fill: "text.secondary" },
});

export const marginalRateTable = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
