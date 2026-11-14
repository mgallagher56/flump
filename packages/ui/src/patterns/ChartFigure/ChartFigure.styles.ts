import { cva } from "../../../styled-system/css";

export const chartFigureRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    margin: "0",
    width: "100%",
  },
});

/**
 * `heading.sm` carries the heading face with the wider word spacing that keeps "Your pension pot"
 * from reading as one word at semibold weight. Tracking is reset to the `normal` token so no
 * negative letter-spacing narrows the gaps again (R2-2).
 */
export const chartFigureTitle = cva({
  base: {
    textStyle: "heading.sm",
    letterSpacing: "normal",
    color: "text.primary",
    margin: "0",
  },
});

export const chartFigureSummary = cva({
  base: {
    margin: "0",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartFigureData = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
    // Wide data tables scroll inside the drawer instead of the page (audit R-17).
    overflowX: "auto",
  },
});

export const chartFigureNotice = cva({
  base: { margin: "0" },
});

export const chartFigureLegend = cva({
  base: { margin: "0" },
});

export const chartFigureCaption = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", margin: "0" },
});

// One-line prompt drawn instead of a chart with too few points (plan P10.6).
export const chartFigurePrompt = cva({
  base: {
    margin: "0",
    py: "6",
    px: "4",
    textStyle: "body.sm",
    color: "text.secondary",
    textAlign: "center",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "border",
  },
});
