import { css, cva } from "@repo/ui/styled-system/css";
import type { CSSProperties } from "react";

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

export const panelStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  "&[hidden]": { display: "none" },
});

export const mutedNote = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
});

export const assumedLabel = css({
  fontSize: "xs",
  color: "text.muted",
  fontStyle: "italic",
  marginLeft: "6px",
});

export const noteLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
});

export const strong = css({
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});

/** £100k to £125k Personal Allowance taper: a warning stated as fact with a modelling button. */
export const trapAlert = css({
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
  fontSize: "sm",
  "& p": { margin: 0 },
});

export const trapHeadingRow = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
});

export const trapHeading = css({
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "sm",
  fontWeight: "bold",
  color: "status.warning.text",
});

export const trapAction = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px 14px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "status.warning.border",
  backgroundColor: "surface.card",
  fontSize: "xs",
  "& p": { margin: 0, maxWidth: "600px" },
});

export const promptCard = css({
  margin: 0,
  fontSize: "sm",
  color: "text.muted",
});

export const rulesCard = css({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "20px",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
});

export const rulesHeader = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const rulesTitle = css({
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  textStyle: "heading.sm",
  color: "text.primary",
});

export const rulesActions = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px",
});

export const buttonRow = css({
  display: "flex",
  gap: "6px",
});

export const inlineEditGrid = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr) 1.5fr" },
  gap: "12px",
  padding: "14px",
  borderRadius: "lg",
  backgroundColor: "primary.subtle",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "primary.border",
});

export const fieldLabel = css({
  display: "block",
  marginBottom: "4px",
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.primary",
});

export const inlineInput = css({
  width: "100%",
  padding: "8px 12px",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
  borderRadius: "sm",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.input",
  backgroundColor: "surface.card",
  color: "text.primary",
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "border.focusRing",
    outlineOffset: "1px",
  },
});

export const checkStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  justifyContent: "center",
});

export const checkRow = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  fontSize: "sm",
  color: "text.primary",
  "& input": { marginTop: "3px", accentColor: "token(colors.primary)" },
  "&[data-disabled='true']": { color: "text.muted" },
});

export const checkHint = css({
  display: "block",
  fontSize: "xs",
  color: "text.muted",
});

export const proportionBar = css({
  display: "flex",
  height: "12px",
  width: "100%",
  borderRadius: "full",
  backgroundColor: "border.subtle",
  overflow: "hidden",
});

export const employeeSegment = css({
  backgroundColor: "chart.primary",
  transition: "width 0.4s ease",
});

export const employerSegment = css({
  backgroundColor: "chart.debt",
  transition: "width 0.4s ease",
});

/** Segment widths follow the entered percentages, so they cannot be static classes. */
export const segmentWidth = (percent: number): CSSProperties => ({ width: `${percent}%` });

export const legendRow = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
});

export const legendGroup = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "20px",
});

export const legendItem = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const dot = cva({
  base: {
    width: "10px",
    height: "10px",
    borderRadius: "full",
    display: "inline-block",
    flexShrink: 0,
  },
  variants: {
    series: {
      employee: { backgroundColor: "chart.primary" },
      employer: { backgroundColor: "chart.debt" },
    },
  },
});

export const niNote = css({
  marginLeft: "4px",
  color: "status.positive.text",
});
