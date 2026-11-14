import { cva } from "@repo/ui/styled-system/css";

export const annotationText = cva({
  base: { textStyle: "label.md", fontVariantNumeric: "tabular-nums" },
});

export const chartWrap = cva({
  base: {
    height: { base: "130px", md: "240px" },
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
