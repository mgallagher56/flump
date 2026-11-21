import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const controlsColumn = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const outcomeColumn = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    ...numeric,
  },
});

export const basisText = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
  ...numeric,
});

export const comparisonList = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px 16px",
  borderRadius: "md",
  backgroundColor: "surface.sunken",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  margin: 0,
});

export const comparisonRow = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
});

export const comparisonLabel = css({
  textStyle: "body.sm",
  color: "text.secondary",
});

export const comparisonValue = css({
  textStyle: "numeric.md",
  color: "text.primary",
  margin: 0,
  ...numeric,
});
