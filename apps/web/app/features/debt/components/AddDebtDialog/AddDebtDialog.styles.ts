import { cva } from "@repo/ui/styled-system/css";

export const debtForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
  },
});

export const nativeSelect = cva({
  base: {
    width: "100%",
    minHeight: "44px",
    paddingX: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
