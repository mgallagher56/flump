import { cva } from "@repo/ui/styled-system/css";

export const effectRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    padding: "4",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    fontVariantNumeric: "tabular-nums",
    minWidth: "0",
  },
});

export const effectHeader = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2" },
});

export const effectTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: "0", marginRight: "auto" },
});

export const effectBadges = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});

export const effectSentence = cva({
  base: {
    textStyle: "body.md",
    color: "text.primary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const effectNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const effectLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const effectUnverified = cva({
  base: {
    margin: "0",
    paddingBlock: "3",
    paddingInline: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.warning.border",
    backgroundColor: "status.warning.bg",
    color: "status.warning.text",
    textStyle: "body.sm",
  },
});
