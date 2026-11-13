import { cva } from "@repo/ui/styled-system/css";

export const forecastBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const forecastTitle = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: 0 },
});
