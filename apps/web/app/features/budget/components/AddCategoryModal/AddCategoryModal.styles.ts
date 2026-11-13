import { cva } from "@repo/ui/styled-system/css";

export const modalForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px" },
});

export const suggestionLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0, marginBottom: "8px" },
});

export const suggestionList = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px" },
});

export const suggestionChip = cva({
  base: {
    minHeight: "36px",
    paddingX: "14px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "label.md",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    _hover: { borderColor: "primary.border", backgroundColor: "surface.subtle" },
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    selected: {
      true: { backgroundColor: "primary.subtle", borderColor: "primary.border" },
      false: {},
    },
  },
  defaultVariants: { selected: false },
});

export const modalActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
});
