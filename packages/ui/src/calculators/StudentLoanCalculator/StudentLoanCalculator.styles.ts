import { css, cva } from "../../../styled-system/css/index.js";

export const cardStyle = css({
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  boxShadow: "sm",
});

export const headerStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "12px",
});

export const titleStyle = css({
  textStyle: "heading.md",
  color: "text.primary",
  margin: "0 0 4px 0",
});

export const introStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
  margin: 0,
});

export const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
});

export const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
});

export const fieldLabelStyle = css({
  textStyle: "label.md",
  color: "text.primary",
});

export const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.canvas",
  color: "text.primary",
  textStyle: "body.md",
  fontVariantNumeric: "tabular-nums",
});

export const resultsBoxStyle = css({
  backgroundColor: "surface.canvas",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
});

export const badgeRecipe = cva({
  base: {
    display: "inline-block",
    textStyle: "label.sm",
    padding: "2px 8px",
    borderRadius: "md",
  },
  variants: {
    tone: {
      danger: { backgroundColor: "status.danger.bg", color: "status.danger.text" },
      positive: { backgroundColor: "status.positive.bg", color: "status.positive.text" },
    },
  },
  defaultVariants: { tone: "danger" },
});

export const figureRecipe = cva({
  base: {
    textStyle: "numeric.lg",
    fontVariantNumeric: "tabular-nums",
    marginTop: "4px",
  },
  variants: {
    tone: {
      danger: { color: "status.danger.text" },
      positive: { color: "status.positive.text" },
      neutral: { color: "text.primary" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const noteStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
  margin: "4px 0 0 0",
});

export const calloutRecipe = cva({
  base: {
    padding: "14px",
    borderRadius: "lg",
    border: "1px solid",
  },
  variants: {
    tone: {
      neutral: { backgroundColor: "surface.card", borderColor: "border" },
      danger: { backgroundColor: "status.danger.bg", borderColor: "status.danger.border" },
      positive: { backgroundColor: "status.positive.bg", borderColor: "status.positive.border" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const calloutTitleRecipe = cva({
  base: { textStyle: "label.md" },
  variants: {
    tone: {
      neutral: { color: "text.primary" },
      danger: { color: "status.danger.text" },
      positive: { color: "status.positive.text" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const calloutBodyRecipe = cva({
  base: {
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    margin: "4px 0 0 0",
  },
  variants: {
    tone: {
      neutral: { color: "text.muted" },
      danger: { color: "status.danger.text" },
      positive: { color: "text.primary" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const ctaStyle = css({ width: "100%" });
