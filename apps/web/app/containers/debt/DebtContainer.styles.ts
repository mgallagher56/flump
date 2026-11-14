import { css } from "@repo/ui/styled-system/css";

export const pageRoot = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "64px",
});

/** A failed save: a real error, so the danger status colours apply (not a judgement). */
export const errorBanner = css({
  margin: 0,
  padding: "12px 16px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "status.danger.border",
  backgroundColor: "status.danger.bg",
  color: "status.danger.text",
  fontSize: "sm",
});

export const footerLink = css({
  padding: 0,
  background: "transparent",
  border: "none",
  color: "primary",
  textDecoration: "underline",
  cursor: "pointer",
  minHeight: "touch",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const plainLink = css({
  color: "primary",
  textDecoration: "underline",
  fontWeight: "medium",
  textStyle: "body.sm",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
