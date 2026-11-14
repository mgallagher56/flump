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

export const gridStyle = css({
  display: "grid",
  // minmax(0, …) lets the columns shrink below their inputs' intrinsic width on a phone.
  gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 1.1fr) minmax(0, 0.9fr)" },
  gap: "32px",
});

export const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
  minWidth: "0",
});

export const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.canvas",
  color: "text.primary",
  fontSize: "15px",
  width: "100%",
  minWidth: "0",
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

export const headerRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "3",
});

export const titleStyle = css({
  textStyle: "heading.md",
  color: "text.primary",
  margin: 0,
  marginBottom: "1",
});

export const introStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
  margin: 0,
});

export const liabilityCardStyle = css({
  padding: "3",
  backgroundColor: "primary.subtle",
  border: "none",
  borderRadius: "lg",
  margin: "0",
  marginBottom: "4",
  minWidth: "0",
});

export const liabilityTitleStyle = css({
  textStyle: "label.md",
  color: "text.primary",
  float: "left",
  width: "100%",
  padding: "0",
  marginBottom: "2",
});

export const liabilityFieldsStyle = css({
  clear: "both",
  display: "grid",
  // Stacked on a phone (E-prerelease defect 10: 688px wide at 375); three across from sm up.
  gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
  columnGap: "3",
});

export const fieldLabelStyle = css({
  textStyle: "label.sm",
  color: "text.secondary",
});

export const surplusRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const surplusLabelStyle = css({
  textStyle: "label.md",
  color: "text.primary",
});

export const pillWrapStyle = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
});

export const pillPrefixStyle = css({
  position: "absolute",
  left: "2",
  textStyle: "label.sm",
  color: "text.muted",
});

export const pillSuffixStyle = css({
  textStyle: "label.sm",
  color: "text.muted",
  marginLeft: "1",
});

export const pillInputStyle = css({
  width: "20",
  paddingY: "1",
  paddingRight: "2",
  paddingLeft: "6",
  textStyle: "label.md",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
  color: "primary",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.card",
});

export const rangeStyle = css({
  width: "100%",
  accentColor: "primary",
});

export const tagStyle = cva({
  base: {
    textStyle: "label.sm",
    fontWeight: "bold",
    paddingX: "2",
    paddingY: "1",
    borderRadius: "sm",
  },
  variants: {
    tone: {
      warning: { backgroundColor: "status.warning.bg", color: "status.warning.text" },
      info: { backgroundColor: "status.info.bg", color: "status.info.text" },
    },
  },
});

export const heroFigureStyle = css({
  textStyle: "numeric.lg",
  fontVariantNumeric: "tabular-nums",
  color: "status.positive.text",
  marginTop: "1",
});

export const captionStyle = css({
  textStyle: "body.sm",
  fontVariantNumeric: "tabular-nums",
  color: "text.muted",
  margin: 0,
  marginTop: "1",
});

export const savedBoxStyle = css({
  padding: "3",
  backgroundColor: "surface.card",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
});

export const savedLabelStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
});

export const savedFigureStyle = css({
  textStyle: "numeric.md",
  fontVariantNumeric: "tabular-nums",
  color: "status.danger.text",
  marginTop: "1",
});

export const snowballWinStyle = css({
  textStyle: "heading.sm",
  color: "text.primary",
  marginTop: "1",
});

export const ctaStyle = css({ width: "100%" });
