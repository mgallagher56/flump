import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const summaryCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    minWidth: 0,
  },
});

export const summaryHeader = css({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const summaryTitle = css({
  textStyle: "heading.sm",
  color: "text.primary",
  margin: 0,
});

export const summarySubtitle = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
});

export const toggleList = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const toggleRow = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  paddingTop: "12px",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
});

export const toggleAmount = css({
  textStyle: "numeric.sm",
  color: "text.secondary",
  flexShrink: 0,
  ...numeric,
});

export const factRow = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "16px",
  paddingTop: "12px",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
  flexWrap: "wrap",
});

export const factLabel = css({
  textStyle: "body.sm",
  color: "text.secondary",
});

export const factValue = css({
  textStyle: "numeric.md",
  color: "text.primary",
  ...numeric,
});

export const missingActions = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "4px",
});
