import { cva } from "../../../styled-system/css";

export const siteFooterRoot = cva({
  base: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    color: "text.muted",
    paddingBlock: "40px",
    paddingInline: { base: "16px", md: "24px" },
  },
});

export const siteFooterInner = cva({
  base: {
    maxWidth: "5xl",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
});

export const siteFooterGrid = cva({
  base: {
    display: "grid",
    // Brand column twice the width of each link column, however many columns a site passes.
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "2fr" },
    gridAutoColumns: { md: "1fr" },
    gridAutoFlow: { md: "column" },
    gap: "32px",
  },
});

export const siteFooterBlurb = cva({ base: { maxWidth: "380px" } });

export const siteFooterList = cva({
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

export const siteFooterLink = cva({
  base: {
    color: "text.secondary",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const siteFooterBottom = cva({
  base: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    paddingTop: "24px",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
  },
});
