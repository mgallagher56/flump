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

export const chartFigureTitle = cva({
  base: {
    fontSize: "md",
    fontWeight: "semibold",
    color: "text.primary",
    margin: "0",
  },
});

export const chartFigureSummary = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartFigureData = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
  },
});
