import { css } from "../../../styled-system/css/index.js";

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
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
});

export const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
});

export const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.canvas",
  color: "text.primary",
  fontSize: "15px",
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
