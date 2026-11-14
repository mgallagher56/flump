import { cva } from "@repo/ui/styled-system/css";

export const dialogBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const editGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "14px",
    alignItems: "start",
    "& > *": { minWidth: 0 },
  },
});

export const estimateRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    flexWrap: "wrap",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const unsavedNote = cva({
  base: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.secondary",
    "& p": { margin: 0 },
  },
});
