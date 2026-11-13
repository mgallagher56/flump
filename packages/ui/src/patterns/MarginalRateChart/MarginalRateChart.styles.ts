import { cva } from "../../../styled-system/css";

export const marginalRateSvg = cva({
  base: { width: "100%", height: "auto", display: "block", overflow: "visible" },
});

export const marginalRateGrid = cva({
  base: { stroke: "chart.grid", strokeWidth: "1" },
});

export const marginalRateAxisText = cva({
  base: { fill: "text.muted", fontSize: "14px", fontVariantNumeric: "tabular-nums" },
});

export const marginalRateAxisTitle = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: "0" },
  variants: {
    position: { start: { textAlign: "start" }, end: { textAlign: "end" } },
  },
  defaultVariants: { position: "start" },
});

export const marginalRateChartArea = cva({
  base: { position: "relative", display: "flex", flexDirection: "column", gap: "1" },
});

export const marginalRateTooltip = cva({
  base: {
    position: "absolute",
    top: "0",
    left: "var(--tip-x)",
    maxWidth: "min(18rem, 90%)",
    paddingBlock: "1.5",
    paddingInline: "2.5",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    backgroundColor: "surface.overlay",
    color: "text.primary",
    boxShadow: "overlay",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    pointerEvents: "none",
    zIndex: "1",
  },
  variants: {
    align: {
      start: { transform: "translateX(-8px)" },
      center: { transform: "translateX(-50%)" },
      end: { transform: "translateX(calc(-100% + 8px))" },
    },
  },
  defaultVariants: { align: "center" },
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

export const marginalRateChartPlot = cva({
  base: { position: "relative" },
});

/** Transparent hover target over each threshold line (the plot spans 28/280 to 250/280 of the height). */
export const marginalRateHitArea = cva({
  base: {
    position: "absolute",
    top: "7%",
    height: "82%",
    left: "calc(var(--mx) - 8px)",
    width: "16px",
    padding: "0",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing" },
  },
});

export const marginalRateYourPay = cva({
  base: { stroke: "chart.warning", strokeWidth: "2.5" },
});

export const marginalRateYourPayText = cva({
  base: { fill: "text.primary", fontSize: "14px", fontWeight: "bold" },
});

export const marginalRateYourPayDot = cva({
  base: { fill: "chart.warning" },
});

export const marginalRateTable = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
