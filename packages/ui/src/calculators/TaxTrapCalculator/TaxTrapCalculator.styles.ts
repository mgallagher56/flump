import { css } from "../../../styled-system/css/index.js";

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
  accentColor: "var(--colors-primary)",
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
