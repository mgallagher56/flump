import { cva } from "@repo/ui/styled-system/css";

export const forecastStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const noSalaryNote = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.secondary" },
});

export const noSalaryLink = cva({
  base: { color: "primary", fontWeight: "semibold", textDecoration: "underline" },
});
