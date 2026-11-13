import { css, cva } from "@repo/ui/styled-system/css";

export const resultsCard = cva({
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
  fontSize: "xs",
  color: "text.muted",
});

export const fieldGroup = cva({
  base: {
    minWidth: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
});

export const fieldLabel = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.secondary",
  },
});

export const selectInput = cva({
  base: {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    fontSize: "sm",
    backgroundColor: "surface.card",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const breakdownHeader = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
});

export const breakdownTitle = css({
  margin: 0,
  fontSize: "sm",
  fontWeight: "semibold",
  color: "text.primary",
});

export const interestShareText = css({
  fontVariantNumeric: "tabular-nums",
});

export const legendRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
  },
});

export const legendItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "xs",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    minWidth: 0,
  },
});

export const legendDot = cva({
  base: {
    width: "10px",
    height: "10px",
    borderRadius: "full",
    flexShrink: 0,
  },
  variants: {
    kind: {
      principal: {
        backgroundColor: "surface.sunken",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.strong",
      },
      interest: { backgroundColor: "status.danger.solid" },
    },
  },
  defaultVariants: { kind: "principal" },
});

export const infoPanel = cva({
  base: {
    padding: "16px",
    borderRadius: "md",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
});

export const infoIcon = css({
  color: "primary",
  marginTop: "2px",
  flexShrink: 0,
});

export const infoText = css({
  margin: 0,
  minWidth: 0,
  fontSize: "xs",
  lineHeight: "1.5",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
  "& strong": { color: "text.primary", fontWeight: "semibold" },
});
