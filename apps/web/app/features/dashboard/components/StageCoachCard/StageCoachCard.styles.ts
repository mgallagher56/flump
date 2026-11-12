import { cva } from "@repo/ui/styled-system/css";

export const allowanceNote = cva({
  base: {
    textStyle: "label.md",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "4px",
  },
});

export const allowanceLink = cva({
  base: {
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { textDecoration: "none" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
