import { css, cva } from "../../../styled-system/css";

export const page = cva({
  base: {
    p: { base: "16px", md: "24px" },
    backgroundColor: "surface.canvas",
    color: "text.primary",
    minHeight: "100%",
    display: "grid",
    gap: "24px",
  },
});

export const swatchGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
    gap: "12px",
    listStyle: "none",
    p: 0,
    m: 0,
  },
});

export const swatchCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    p: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const swatchCaption = css({ color: "text.muted", textStyle: "label.sm" });

export const chartCard = cva({
  base: {
    p: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "grid",
    gap: "12px",
  },
});

export const chartSvg = cva({
  base: { width: "100%", height: "auto", display: "block" },
});

export const axisText = cva({
  base: {
    fill: "text.muted",
    textStyle: "numeric.sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const legendList = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 20px",
    listStyle: "none",
    p: 0,
    m: 0,
    textStyle: "label.md",
    color: "text.secondary",
  },
});

export const legendItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "8px" },
});

export const caption = cva({
  base: { textStyle: "body.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});
