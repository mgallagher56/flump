import { cva } from "@repo/ui/styled-system/css";

export const footerRoot = cva({
  base: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    color: "text.muted",
    paddingBlock: "40px",
    paddingInline: { base: "16px", md: "24px" },
  },
});

export const footerInner = cva({
  base: {
    maxWidth: "5xl",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
});

export const footerGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "2fr 1fr 1fr" },
    gap: "32px",
  },
});

export const footerBlurb = cva({ base: { maxWidth: "380px" } });

export const footerList = cva({
  base: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    textStyle: "body.sm",
  },
});

export const footerLink = cva({
  base: {
    color: "text.secondary",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const footerBottom = cva({
  base: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    paddingTop: "24px",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
  },
});
