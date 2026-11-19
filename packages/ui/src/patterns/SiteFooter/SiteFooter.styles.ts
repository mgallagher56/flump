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
  variants: {
    variant: {
      full: {},
      // One line that marks the end of the page: a 44px row (the logo link's touch target).
      compact: { paddingBlock: "3" },
    },
  },
  defaultVariants: { variant: "full" },
});

/** The compact footer's single row: logo, then the links, then the company line where it fits. */
export const siteFooterCompactRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: { base: "3", md: "6" },
    minHeight: "touch",
    // Never a second line: links that would not fit are left out at that width (`show`).
    flexWrap: "nowrap",
    minWidth: 0,
  },
});

/**
 * The links stay on the logo's line (owner ruling). When they cannot all fit, as at 200% text on a
 * phone, the line scrolls sideways inside the footer instead of widening the page, which on a phone
 * also stretches the fixed bottom bar off screen (phone sweep 5).
 */
export const siteFooterCompactNav = cva({
  base: { minWidth: 0, overflowX: "auto", overscrollBehaviorX: "contain" },
});

export const siteFooterCompactList = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: { base: "3", md: "5" },
    listStyle: "none",
    margin: 0,
    padding: 0,
    flexWrap: "nowrap",
  },
});

export const siteFooterCompactItem = cva({
  base: { flexShrink: 0 },
  variants: {
    show: {
      always: {},
      belowMd: { md: { display: "none" } },
      fromMd: { display: "none", md: { display: "list-item" } },
    },
  },
  defaultVariants: { show: "always" },
});

/** A 44px-tall target around small text, so the line stays short without small targets. */
export const siteFooterCompactLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "touch",
    textStyle: "label.sm",
    color: "text.secondary",
    whiteSpace: "nowrap",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** The company line: last on the row, pushed to the end, shown only where it fits. */
export const siteFooterCompactText = cva({
  base: {
    margin: 0,
    marginLeft: "auto",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    from: { always: {}, lg: { display: "none", lg: { display: "block" } } },
  },
  defaultVariants: { from: "always" },
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
