import { cva } from "@repo/ui/styled-system/css";

export const calculatorRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "32px", minWidth: 0 },
});

export const detailList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
    margin: 0,
  },
});

export const detailItem = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px" },
});

export const detailLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary" },
});

export const detailValue = cva({
  base: {
    textStyle: "body.md",
    fontWeight: "bold",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const detailHint = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const detailNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const zoneLink = cva({
  base: {
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
