import { cva } from "@repo/ui/styled-system/css";

export const inputsCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: { base: "16px", md: "20px" },
    minWidth: 0,
  },
});

export const inputsHeading = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const inputsHint = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const inputsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, minmax(0, 1fr))" },
    gap: "16px",
  },
});

export const editedMark = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});
