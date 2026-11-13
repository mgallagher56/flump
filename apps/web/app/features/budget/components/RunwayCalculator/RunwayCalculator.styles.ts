import { cva } from "@repo/ui/styled-system/css";

export const runwayRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px" },
});

export const introCard = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const introText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "60ch" },
});

export const introActions = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const savedNote = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    textStyle: "label.sm",
    color: "status.positive.text",
  },
});

export const heroValue = cva({
  base: {
    textStyle: "numeric.kpi",
    color: "text.onContrast",
    fontVariantNumeric: "tabular-nums",
  },
});

export const heroSubtext = cva({
  base: { display: "inline-flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" },
});

export const cardHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
});

export const cardTitleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const bulkActions = cva({
  base: { display: "flex", gap: "4px" },
});

export const mutedNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const rowList = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const toggleRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  variants: {
    on: {
      true: { backgroundColor: "primary.subtle", borderColor: "primary.border" },
      false: {},
    },
  },
  defaultVariants: { on: false },
});

export const toggleInfo = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const toggleName = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: 0 },
});

export const toggleMeta = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const toggleEnd = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
});

export const switchButton = cva({
  base: {
    position: "relative",
    width: "44px",
    height: "26px",
    flexShrink: 0,
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.strong",
    backgroundColor: "surface.sunken",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&[aria-checked='true']": { backgroundColor: "primary.solid", borderColor: "primary.solid" },
    "&::after": {
      content: '""',
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "20px",
      height: "20px",
      borderRadius: "full",
      backgroundColor: "surface.card",
      boxShadow: "xs",
      transition: "transform 0.15s ease",
    },
    "&[aria-checked='true']::after": { transform: "translateX(18px)" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const totalRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    textStyle: "label.md",
    color: "text.secondary",
  },
});

export const statusRow = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
});

export const statusCopy = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const thresholds = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
    textStyle: "label.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const breakdownList = cva({
  base: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" },
});

export const breakdownRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const whatIfGrid = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const ctaRow = cva({
  base: { marginTop: "4px" },
});
