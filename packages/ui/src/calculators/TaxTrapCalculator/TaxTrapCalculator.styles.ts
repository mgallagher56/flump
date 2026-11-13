import { css, cva } from "../../../styled-system/css/index.js";

export const cardStyle = css({
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", sm: "32px" },
  boxShadow: "floating",
  marginBottom: "40px",
});

export const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "20px",
});

export const sliderStyle = css({
  width: "100%",
  accentColor: "primary",
  cursor: "pointer",
  height: "6px",
});

export const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "16px",
  marginTop: "24px",
  marginBottom: "24px",
});

export const metricCard = css({
  backgroundColor: "surface.canvas",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const headerStyle = css({ marginBottom: "6" });

export const badgeRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  marginBottom: "2",
});

export const badgeStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    paddingX: "3",
    paddingY: "1",
    borderRadius: "full",
    textStyle: "label.sm",
    fontWeight: "bold",
  },
  variants: {
    tone: {
      brand: {
        backgroundColor: "primary.subtle",
        color: "primary",
        textTransform: "uppercase",
        letterSpacing: "wider",
      },
      danger: { backgroundColor: "status.danger.bg", color: "status.danger.text" },
    },
  },
  defaultVariants: { tone: "brand" },
});

export const titleStyle = css({
  textStyle: "heading.md",
  color: "text.primary",
  margin: 0,
  marginBottom: "1",
});

export const introStyle = css({ textStyle: "body.sm", color: "text.muted", margin: 0 });

export const fieldRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const fieldLabelStyle = css({ textStyle: "label.md", color: "text.primary" });

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

export const pillInputStyle = cva({
  base: {
    width: "28",
    paddingY: "1",
    paddingRight: "2",
    paddingLeft: "5",
    textStyle: "label.md",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
  },
  variants: {
    tone: {
      primary: { color: "primary" },
      positive: { color: "status.positive.text" },
    },
  },
  defaultVariants: { tone: "primary" },
});

export const scaleLabelsStyle = css({
  display: "flex",
  justifyContent: "space-between",
  textStyle: "label.sm",
  fontVariantNumeric: "tabular-nums",
  color: "text.muted",
});

export const metricLabelStyle = css({ textStyle: "body.sm", color: "text.muted" });

export const metricValueStyle = cva({
  base: {
    textStyle: "numeric.lg",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      positive: { color: "status.positive.text" },
      danger: { color: "status.danger.text" },
      primary: { color: "primary" },
    },
  },
  defaultVariants: { tone: "positive" },
});

export const metricNoteStyle = css({
  textStyle: "label.sm",
  fontVariantNumeric: "tabular-nums",
  color: "text.muted",
});

export const estimateNoteStyle = css({
  textStyle: "body.sm",
  fontVariantNumeric: "tabular-nums",
  color: "text.muted",
  margin: 0,
  marginTop: "-2",
  marginBottom: "4",
});

export const childcareStyle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3",
    paddingX: "4",
    paddingY: "3",
    borderRadius: "lg",
    border: "1px solid",
    marginBottom: "6",
    textStyle: "label.md",
    color: "text.primary",
  },
  variants: {
    eligible: {
      true: { backgroundColor: "status.positive.bg", borderColor: "status.positive.border" },
      false: { backgroundColor: "status.danger.bg", borderColor: "status.danger.border" },
    },
  },
});

export const childcareIconStyle = cva({
  variants: {
    eligible: {
      true: { color: "status.positive.text" },
      false: { color: "status.danger.text" },
    },
  },
});

export const ctaStyle = css({ width: "100%", justifyContent: "center" });

export const ctaIconStyle = css({ marginLeft: "2" });
