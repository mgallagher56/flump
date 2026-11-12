import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const simRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const simHeader = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "12px",
  minWidth: 0,
});

export const titleRow = css({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
});

export const titleIcon = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "md",
  backgroundColor: "status.warning.bg",
  color: "status.warning.text",
  flexShrink: 0,
});

export const simTitle = css({
  fontSize: "md",
  fontWeight: "semibold",
  color: "text.primary",
  m: 0,
});

export const simDescription = css({
  fontSize: "xs",
  color: "text.muted",
  mt: "4px",
  mb: 0,
});

export const panel = cva({
  base: {
    p: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    minWidth: 0,
  },
});

export const fieldGroup = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
});

export const fieldLabel = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.primary",
});

export const selectRow = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

export const selectStyle = css({
  flex: "1 1 96px",
  minWidth: 0,
  p: "8px 12px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.input",
  backgroundColor: "surface.card",
  color: "text.primary",
  fontSize: "sm",
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});

export const remainingText = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.secondary",
  m: 0,
  ...numeric,
});

export const kpiNote = css({
  ...numeric,
});

export const ltvBox = cva({
  base: {
    p: "14px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "primary.border",
    backgroundColor: "primary.subtle",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    minWidth: 0,
  },
});

export const ltvHeading = css({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "8px",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "text.primary",
  m: 0,
  ...numeric,
});

export const ltvMuted = css({
  fontSize: "xs",
  fontWeight: "normal",
  color: "text.muted",
});

export const ltvBody = css({
  fontSize: "xs",
  color: "text.secondary",
  mt: "4px",
  mb: 0,
  ...numeric,
});

export const ltvTotal = css({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  textAlign: { base: "left", sm: "right" },
  fontSize: "xs",
  color: "text.muted",
  ...numeric,
});
