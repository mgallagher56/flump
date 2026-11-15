import { cva } from "@repo/ui/styled-system/css";

export const forecastControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const forecastContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", minWidth: 0 },
});

/** The split behind the result, shown with the chart's data table. */
export const outcomeSupport = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6", margin: "0", mt: "2" },
});

export const outcomeSupportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    textStyle: "body.sm",
    color: "text.secondary",
    "& dd": {
      margin: "0",
      textStyle: "body.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const chartWrap = cva({
  base: {
    width: "100%",
    height: "240px",
    minWidth: 0,
    fontSize: "xs",
    fontVariantNumeric: "tabular-nums",
    "& .recharts-cartesian-axis-tick-value": {
      fill: "text.muted",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const annotationText = cva({
  base: { textStyle: "label.md", fill: "text.primary", fontVariantNumeric: "tabular-nums" },
});

/** The small surface chip behind the end label, so it reads clearly over the area fill. */
export const annotationChip = cva({
  base: { fill: "surface.card", stroke: "border.subtle", strokeWidth: "1" },
});

export const moreOptions = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", pt: "2" },
});
