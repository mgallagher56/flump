import { css, cva } from "@repo/ui/styled-system/css";

export const switcherCard = cva({
  base: {
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
});

export const cardHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const cardSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const surplusRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    fontSize: "xs",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const impactNote = cva({
  base: {
    margin: 0,
    padding: "10px 14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
    backgroundColor: "primary.subtle",
    color: "text.primary",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const strategyGroup = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },
});

export const strategyOption = cva({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    borderRadius: "xl",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    cursor: "pointer",
    minHeight: "touch",
    "&:has(:focus-visible)": {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    _hover: { borderColor: "border.strong" },
  },
  variants: {
    active: {
      true: { borderColor: "primary", backgroundColor: "primary.subtle" },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const optionHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "text.primary",
    fontWeight: "semibold",
    fontSize: "md",
    "& svg": { flexShrink: 0, color: "text.secondary" },
  },
});

export const optionHint = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
});

export const optionHeadline = css({
  margin: 0,
  fontSize: "sm",
  fontWeight: "semibold",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const optionFacts = cva({
  base: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "2px 12px",
    fontSize: "xs",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    "& dt": { color: "text.muted" },
    "& dd": { margin: 0, textAlign: "right" },
  },
});

/** Non-interactive baseline: what paying only the minimums looks like. */
export const baselineBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});
