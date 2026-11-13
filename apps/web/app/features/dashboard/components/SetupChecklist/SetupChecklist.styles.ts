import { cva } from "@repo/ui/styled-system/css";

export const panel = cva({
  base: {
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "primary.border",
    backgroundColor: "primary.subtle",
    overflow: "hidden",
    marginBottom: { base: "3", md: "6" },
  },
});

export const header = cva({
  base: {
    position: "relative",
    display: "flex",
    alignItems: "stretch",
  },
});

export const headingWrap = cva({
  base: { flex: "1", minWidth: 0, margin: 0, font: "inherit" },
});

export const toggle = cva({
  base: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "3",
    textAlign: "left",
    background: "none",
    border: "none",
    margin: 0,
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    paddingBlock: { base: "3", md: "4" },
    paddingInlineStart: { base: "3.5", md: "5" },
    paddingInlineEnd: { base: "11", md: "14" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const titleRow = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2" },
});

export const title = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const countBadge = cva({
  base: {
    textStyle: "label.sm",
    color: "text.primary",
    backgroundColor: "surface.card",
    border: "1px solid",
    borderColor: "primary.border",
    fontVariantNumeric: "tabular-nums",
    paddingInline: "2",
    paddingBlock: "0.5",
    borderRadius: "full",
  },
});

export const chevron = cva({
  base: { color: "text.muted", display: "flex", flexShrink: 0 },
});

export const dismissButton = cva({
  base: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    right: { base: "2.5", md: "4" },
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "text.muted",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "1",
    borderRadius: "sm",
    _hover: { color: "text.primary" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const progressWrap = cva({
  base: {
    paddingInline: { base: "3.5", md: "5" },
    paddingBottom: { base: "3", md: "4" },
    maxWidth: "320px",
  },
});

export const stepList = cva({
  base: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyle: "none",
    borderTop: "1px solid",
    borderColor: "border",
  },
  variants: {
    columns: {
      one: { gridTemplateColumns: "1fr" },
      responsive: { gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" } },
    },
  },
  defaultVariants: { columns: "responsive" },
});

export const stepItem = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    paddingBlock: { base: "2.5", md: "4" },
    paddingInline: { base: "3.5", md: "5" },
    borderBottom: "1px solid",
    borderColor: "border",
  },
  variants: {
    complete: {
      true: { backgroundColor: "status.positive.bg" },
      false: { backgroundColor: "transparent" },
    },
  },
  defaultVariants: { complete: false },
});

export const statusIcon = cva({
  base: { marginTop: "0.5", flexShrink: 0, display: "inline-flex" },
  variants: {
    complete: {
      true: { color: "status.positive.text" },
      false: { color: "chart.baseline" },
    },
  },
  defaultVariants: { complete: false },
});

export const stepBody = cva({ base: { flex: "1", minWidth: 0 } });

export const stepTitleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "1.5", marginBottom: "1" },
});

export const stepIcon = cva({
  base: { display: "inline-flex", flexShrink: 0 },
  variants: {
    tone: {
      warning: { color: "status.warning.text" },
      primary: { color: "chart.primary" },
      positive: { color: "status.positive.text" },
      purple: { color: "chart.accentPurple" },
      series: { color: "chart.series2" },
    },
  },
  defaultVariants: { tone: "primary" },
});

export const stepLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
  variants: {
    complete: {
      true: { textDecoration: "line-through", color: "text.secondary" },
      false: {},
    },
  },
  defaultVariants: { complete: false },
});

export const stepDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", marginBottom: "2.5" },
});

export const unlockedNote = cva({
  base: {
    textStyle: "label.sm",
    color: "status.positive.text",
    backgroundColor: "status.positive.bg",
    paddingInline: "2",
    paddingBlock: "0.5",
    borderRadius: "md",
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
  },
});

export const actionButton = cva({
  base: {
    textStyle: "label.sm",
    color: "primary",
    background: "none",
    border: "1px solid",
    borderColor: "primary.border",
    borderRadius: "sm",
    paddingInline: "2.5",
    paddingBlock: "1",
    cursor: "pointer",
    _hover: { backgroundColor: "primary.subtle" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
    "&[aria-disabled=true]": { cursor: "not-allowed", color: "text.muted" },
  },
});
