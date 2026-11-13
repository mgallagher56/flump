import { css, cva } from "@repo/ui/styled-system/css";

export const pageRoot = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "64px",
});

export const tabList = cva({
  base: {
    margin: 0,
    padding: 0,
    display: "flex",
    gap: "4px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    overflowX: "auto",
    minWidth: 0,
  },
});

export const tabButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    px: "14px",
    py: "10px",
    minH: "touch",
    textStyle: "label.md",
    whiteSpace: "nowrap",
    cursor: "pointer",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    marginBottom: "-1px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: {
    active: {
      true: { color: "primary", borderBottomColor: "primary" },
      false: {
        color: "text.muted",
        borderBottomColor: "transparent",
        _hover: { color: "text.primary" },
      },
    },
  },
});

export const controlsStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
});

export const mutedNote = css({
  margin: 0,
  fontSize: "sm",
  color: "text.muted",
});

export const noteLink = css({
  color: "primary",
  textDecoration: "underline",
});

export const strong = css({
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});

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

/** 0% promotional rate ending: a warning, stated as fact with a modelling button. */
export const promoAlert = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px 20px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.warning.border",
    backgroundColor: "status.warning.bg",
    color: "text.primary",
  },
});

export const promoAlertHeading = css({
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "sm",
  fontWeight: "bold",
  color: "status.warning.text",
});

export const promoAlertRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "sm",
    "& p": { margin: 0 },
  },
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
