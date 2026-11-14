import { css, cva } from "@repo/ui/styled-system/css";

export const resultsBody = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const costList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "12px 24px",
    margin: 0,
  },
});

export const costRow = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const costLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const costValue = cva({
  base: {
    textStyle: "numeric.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const breakdown = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const interestShareText = css({
  textStyle: "label.sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const legendRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 20px",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const legendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "6px" },
});

export const legendDot = cva({
  base: {
    width: "10px",
    height: "10px",
    borderRadius: "full",
    flexShrink: 0,
    borderWidth: "1px",
    borderStyle: "solid",
  },
  variants: {
    kind: {
      principal: { backgroundColor: "surface.sunken", borderColor: "border.strong" },
      interest: { backgroundColor: "status.neutral.solid", borderColor: "status.neutral.solid" },
    },
  },
  defaultVariants: { kind: "principal" },
});

export const summaryText = css({
  textStyle: "body.sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
  margin: 0,
  maxWidth: "70ch",
});
