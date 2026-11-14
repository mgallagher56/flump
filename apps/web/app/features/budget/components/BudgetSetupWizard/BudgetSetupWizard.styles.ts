import { cva } from "@repo/ui/styled-system/css";

export const wizardRoot = cva({
  base: {
    maxWidth: "720px",
    width: "100%",
    marginX: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
});

export const stepList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: "6px",
    display: "flex",
    gap: "4px",
    overflowX: "auto",
    backgroundColor: "surface.sunken",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const stepItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
    paddingX: "12px",
    minHeight: "32px",
    borderRadius: "lg",
    textStyle: "label.sm",
    color: "text.muted",
  },
  variants: {
    state: {
      current: {
        backgroundColor: "surface.card",
        color: "text.primary",
        boxShadow: "xs",
        fontWeight: "semibold",
      },
      done: { color: "status.positive.text" },
      todo: {},
    },
  },
  defaultVariants: { state: "todo" },
});

export const stepBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minHeight: "320px" },
});

export const stepTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const stepDescription = cva({
  base: { textStyle: "body.md", color: "text.muted", margin: 0, marginTop: "4px" },
});

export const pointList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
  },
});

export const pointRow = cva({
  base: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    textStyle: "body.md",
    color: "text.primary",
  },
});

export const pointIcon = cva({
  base: { color: "primary", flexShrink: 0, marginTop: "2px", display: "inline-flex" },
});

export const choiceGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

export const choiceCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
  variants: {
    featured: {
      true: { borderColor: "primary.border", backgroundColor: "primary.subtle" },
      false: {},
    },
  },
  defaultVariants: { featured: false },
});

export const choiceTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const choiceText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, marginTop: "6px" },
});

export const entryList = cva({
  base: { display: "flex", flexDirection: "column" },
});

export const emptyNote = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    textAlign: "center",
    paddingY: "16px",
    margin: 0,
  },
});

export const callout = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
    textStyle: "body.sm",
  },
});

export const calloutText = cva({
  base: { margin: 0, fontVariantNumeric: "tabular-nums" },
});

export const addPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    marginTop: "12px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "primary.border",
    backgroundColor: "surface.subtle",
  },
});

export const addRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "minmax(0, 1fr) 160px" },
    gap: "12px",
  },
});

export const addActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
});

export const checkboxLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    textStyle: "body.sm",
    color: "text.secondary",
    cursor: "pointer",
  },
});

export const checkbox = cva({
  base: { width: "18px", height: "18px", accentColor: "primary.solid", cursor: "pointer" },
});

export const tipBox = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    marginTop: "16px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
    textStyle: "body.sm",
    color: "text.primary",
  },
});

export const tipLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
});

export const summaryRows = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px" },
});

export const summaryRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px 18px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    textStyle: "label.md",
    color: "text.primary",
  },
});

export const summaryNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const navRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const navRight = cva({
  base: { display: "flex", alignItems: "center", gap: "12px" },
});

export const stepCount = cva({
  base: { textStyle: "label.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});
