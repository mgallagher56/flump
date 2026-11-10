import { cva } from "../../../styled-system/css";

export const crossoverChartContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "card",
    width: "100%",
  },
});

export const crossoverStatsRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
    gap: "12px",
    p: "14px",
    borderRadius: "xl",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});
