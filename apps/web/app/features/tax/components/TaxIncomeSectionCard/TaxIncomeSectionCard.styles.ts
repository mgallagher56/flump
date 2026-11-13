import { cva } from "@repo/ui/styled-system/css";

export const card = cva({
  base: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
});

export const summary = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "stretch", md: "center" },
    justifyContent: "space-between",
    gap: "4",
    px: { base: "3", md: "5" },
    py: { base: "3", md: "4" },
    cursor: "pointer",
    userSelect: "none",
    listStyle: "none",
    "&::-webkit-details-marker": { display: "none" },
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const identity = cva({
  base: { display: "flex", alignItems: "center", gap: "3", minWidth: 0, flex: 1 },
});

export const iconTile = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "10",
    height: "10",
    borderRadius: "md",
    flexShrink: 0,
  },
  variants: {
    tone: {
      blue: { backgroundColor: "status.info.bg", color: "status.info.text" },
      emerald: { backgroundColor: "status.positive.bg", color: "status.positive.text" },
      amber: { backgroundColor: "status.warning.bg", color: "status.warning.text" },
      purple: { backgroundColor: "surface.subtle", color: "text.secondary" },
    },
  },
  defaultVariants: { tone: "blue" },
});

export const titleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" },
});

export const title = cva({
  base: { textStyle: "body.md", fontWeight: "semibold", color: "text.primary" },
});

export const subtitle = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted", marginTop: "1" },
});

export const metricsRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    width: { base: "100%", md: "auto" },
    borderTopWidth: { base: "1px", md: "0" },
    borderTopStyle: "dashed",
    borderTopColor: "border.subtle",
    paddingTop: { base: "3", md: "0" },
  },
});

export const metrics = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "4",
    flex: 1,
  },
});

export const metric = cva({
  base: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
});

export const metricLabel = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chevron = cva({
  base: {
    display: "inline-flex",
    color: "text.muted",
    flexShrink: 0,
    transition: "transform 0.2s ease",
  },
  variants: { open: { true: { transform: "rotate(90deg)" } } },
});

export const body = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    px: { base: "3", md: "5" },
    py: { base: "3", md: "4" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    minWidth: 0,
  },
});

export const toolbar = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const buttonGroup = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2", alignItems: "center" },
});

export const quickAddForm = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      md: "2fr 1fr 1.5fr 1fr 1fr auto",
    },
    gap: "2",
    alignItems: "center",
    padding: { base: "3", md: "4" },
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "lg",
    minWidth: 0,
  },
});

export const empty = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3",
    padding: "6",
    textAlign: "center",
    backgroundColor: "surface.sunken",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "border.subtle",
  },
});

export const emptyText = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const recordName = cva({
  base: { fontWeight: "medium", color: "text.primary" },
});

export const secondaryLine = cva({
  base: {
    display: "block",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const cellMuted = cva({
  base: { color: "text.secondary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});

export const perMonth = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    marginLeft: "1",
    fontVariantNumeric: "tabular-nums",
  },
});

export const clickableRow = cva({
  base: { cursor: "pointer", _hover: { backgroundColor: "surface.subtle" } },
});

export const receiptButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    padding: "1",
    border: "none",
    background: "none",
    color: "primary",
    textStyle: "body.sm",
    cursor: "pointer",
    borderRadius: "sm",
    _hover: { textDecoration: "underline" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});

export const receiptIcon = cva({
  base: { display: "inline-flex" },
  variants: {
    kind: {
      pdf: { color: "status.danger.text" },
      image: { color: "status.info.text" },
    },
  },
});

export const actions = cva({
  base: { display: "inline-flex", gap: "1", justifyContent: "flex-end" },
});

export const iconButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "8",
    height: "8",
    borderRadius: "md",
    border: "none",
    background: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle", color: "text.primary" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
    "@media (pointer: coarse)": { width: "touch", height: "touch" },
  },
  variants: {
    tone: {
      default: {},
      danger: { color: "status.danger.text", _hover: { backgroundColor: "status.danger.bg" } },
    },
  },
  defaultVariants: { tone: "default" },
});
