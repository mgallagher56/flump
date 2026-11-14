import { cva } from "@repo/ui/styled-system/css";

export const heading = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});

export const note = cva({
  base: { margin: 0, marginBottom: "12px", textStyle: "body.sm", color: "text.secondary" },
});

export const flaggedList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const tableCard = cva({
  base: { minWidth: 0, fontVariantNumeric: "tabular-nums" },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});
