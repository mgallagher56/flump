import { css, cva } from "../../../styled-system/css/index.js";

export const cardStyle = css({
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", sm: "32px" },
  boxShadow: "card",
  marginBottom: "40px",
});

export const headerStyle = css({ marginBottom: "24px" });

export const badgeRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  marginBottom: "2",
});

export const badgeStyle = cva({
  base: {
    paddingBlock: "1",
    paddingInline: "2.5",
    borderRadius: "full",
    textStyle: "label.sm",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  variants: {
    tone: {
      warning: { backgroundColor: "status.warning.bg", color: "status.warning.text" },
      info: { backgroundColor: "status.info.bg", color: "status.info.text" },
    },
  },
  defaultVariants: { tone: "warning" },
});

export const titleStyle = css({
  textStyle: "heading.md",
  color: "text.primary",
  margin: "0 0 4px 0",
});

export const subtitleStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
  margin: 0,
});

export const inputGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
  gap: "20px",
  marginBottom: "24px",
});

export const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const inputRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const labelStyle = css({ textStyle: "label.md", color: "text.primary" });

export const inputWrapStyle = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
});

export const adornmentStyle = cva({
  base: { position: "absolute", textStyle: "label.sm", color: "text.muted" },
  variants: {
    side: { start: { left: "2" }, end: { right: "1.5" } },
  },
  defaultVariants: { side: "start" },
});

export const unitStyle = css({ textStyle: "label.sm", color: "text.muted", marginLeft: "1" });

export const numberInputStyle = cva({
  base: {
    textStyle: "label.md",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    paddingBlock: "0.5",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
  },
  variants: {
    tone: {
      warning: { color: "status.warning.text" },
      positive: { color: "status.positive.text" },
      danger: { color: "status.danger.text" },
      info: { color: "status.info.text" },
      primary: { color: "primary" },
      neutral: { color: "text.secondary" },
    },
    width: {
      sm: { width: "70px" },
      md: { width: "90px" },
      lg: { width: "100px" },
    },
    adornment: {
      start: { paddingLeft: "5", paddingRight: "1.5" },
      end: { paddingLeft: "1.5", paddingRight: "4.5" },
    },
  },
  defaultVariants: { tone: "primary", width: "lg", adornment: "start" },
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

export const metricHeaderStyle = css({ display: "flex", alignItems: "center", gap: "1.5" });

export const metricLabelStyle = css({ textStyle: "label.sm", color: "text.muted" });

export const metricValueStyle = cva({
  base: { textStyle: "numeric.lg", fontWeight: "bold", fontVariantNumeric: "tabular-nums" },
  variants: {
    tone: {
      warning: { color: "status.warning.text" },
      positive: { color: "status.positive.text" },
      danger: { color: "status.danger.text" },
    },
  },
  defaultVariants: { tone: "positive" },
});

export const metricIconStyle = cva({
  variants: {
    tone: {
      warning: { color: "status.warning.text" },
      positive: { color: "status.positive.text" },
    },
  },
  defaultVariants: { tone: "warning" },
});

export const metricNoteStyle = css({
  textStyle: "body.sm",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
});

export const ctaRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  paddingTop: "20px",
  borderTop: "1px solid",
  borderColor: "border",
});

export const ctaCopyStyle = css({ maxWidth: "440px" });

export const ctaTitleStyle = css({ textStyle: "label.md", color: "text.primary" });

export const ctaNoteStyle = css({ textStyle: "body.sm", color: "text.muted", margin: 0 });

export const ctaIconStyle = css({ marginLeft: "1.5" });
