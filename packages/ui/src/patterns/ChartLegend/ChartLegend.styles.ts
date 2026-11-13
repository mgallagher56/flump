import { cva } from "../../../styled-system/css";

export const chartLegendList = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "5",
    rowGap: "2",
    listStyle: "none",
    margin: "0",
    padding: "0",
    textStyle: "body.sm",
    color: "text.secondary",
  },
  variants: {
    direction: {
      horizontal: { flexDirection: "row" },
      vertical: { flexDirection: "column" },
    },
  },
  defaultVariants: { direction: "horizontal" },
});

export const chartLegendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "2", minWidth: "0" },
});

export const chartSwatch = cva({
  base: { display: "block", flexShrink: 0, overflow: "visible" },
});

export const chartLegendLabel = cva({
  base: { color: "text.secondary" },
});

export const chartLegendValue = cva({
  base: {
    color: "text.primary",
    fontWeight: "medium",
    fontVariantNumeric: "tabular-nums",
  },
});
