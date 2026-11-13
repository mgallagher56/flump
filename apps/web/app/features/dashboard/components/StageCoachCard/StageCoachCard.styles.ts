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

export const summaryRoot = cva({
  base: { display: "flex", alignItems: "flex-start", gap: "4" },
});

export const summaryIcon = cva({
  base: { color: "primary", flexShrink: 0, mt: "1" },
});

export const summaryBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: 0 },
});

export const summaryEyebrow = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const summaryTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const summaryDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const summaryLinks = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", mt: "2" },
});
