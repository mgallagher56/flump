import { cva } from "@repo/ui/styled-system/css";

export const annotationText = cva({
  base: { textStyle: "label.md", fill: "text.primary", fontVariantNumeric: "tabular-nums" },
});

/** The small surface chip behind the annotation, so it reads clearly over the area fill. */
export const annotationChip = cva({
  base: { fill: "surface.card", stroke: "border.subtle", strokeWidth: "1" },
});

export const chartWrap = cva({
  base: {
    height: { base: "160px", md: "240px" },
    width: "100%",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
    "& .recharts-cartesian-axis-tick-value": {
      fill: "text.muted",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-default-tooltip": {
      backgroundColor: "surface.card!",
      borderColor: "border!",
      color: "text.primary!",
      fontVariantNumeric: "tabular-nums",
    },
    "& .recharts-tooltip-label": { color: "text.muted!" },
  },
});
