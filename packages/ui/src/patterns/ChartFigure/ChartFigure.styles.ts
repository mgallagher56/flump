import { cva } from "../../../styled-system/css";

export const chartFigureRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    margin: "0",
    width: "100%",
  },
});

export const chartFigureTitle = cva({
  base: {
    fontFamily: "display",
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
    // Wide data tables scroll inside the drawer instead of the page (audit R-17).
    overflowX: "auto",
  },
});

export const chartFigureData = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartFigureNotice = cva({
  base: { margin: "0" },
});

export const chartFigureLegend = cva({
  base: { margin: "0" },
});
