import { cva } from "@repo/ui/styled-system/css";

export const body = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    marginTop: "4",
    fontVariantNumeric: "tabular-nums",
  },
});

export const controlsBar = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "1.4fr 1fr 1fr" },
    gap: "3",
    padding: "4",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "md",
  },
});

export const yearTransfer = cva({
  base: { display: "flex", alignItems: "flex-end", gap: "2" },
});

export const yearField = cva({
  base: { flex: 1, minWidth: 0 },
});

export const yearArrow = cva({
  base: { flexShrink: 0, color: "text.muted", paddingBottom: "3" },
});

export const fieldLabel = cva({
  base: { display: "block", textStyle: "label.md", color: "text.primary", marginBottom: "1" },
});

export const recurringToggle = cva({
  base: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    minHeight: "density.control.md",
    px: "3",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    textStyle: "label.md",
    cursor: "pointer",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: "status.info.bg",
        borderColor: "status.info.border",
        color: "status.info.text",
      },
      false: { backgroundColor: "surface.card", color: "text.secondary" },
    },
  },
  defaultVariants: { active: false },
});

export const toolbar = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const adjustGroup = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2" },
});

export const mutedText = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const checkLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    cursor: "pointer",
  },
});

export const checkbox = cva({
  base: {
    accentColor: "primary",
    width: "4",
    height: "4",
    cursor: "pointer",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const tableScroll = cva({
  base: {
    minHeight: 0,
    maxWidth: "100%",
    overflowX: "auto",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "md",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const empty = cva({
  base: { padding: "8", textAlign: "center", textStyle: "body.sm", color: "text.muted" },
});

export const table = cva({
  base: {
    width: "100%",
    minWidth: "32rem",
    borderCollapse: "collapse",
    textStyle: "body.sm",
    textAlign: "left",
    fontVariantNumeric: "tabular-nums",
  },
});

export const headRow = cva({
  base: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: "surface.card",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border",
  },
});

export const th = cva({
  base: { px: "3", py: "2", textStyle: "label.md", color: "text.secondary", fontWeight: "medium" },
  variants: {
    align: {
      start: { textAlign: "left" },
      center: { textAlign: "center" },
      end: { textAlign: "right" },
    },
    narrow: { true: { width: "10" }, false: {} },
    amount: { true: { width: "9.5rem" }, false: {} },
  },
  defaultVariants: { align: "start", narrow: false, amount: false },
});

export const row = cva({
  base: {
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
  variants: {
    selected: {
      true: { backgroundColor: "transparent" },
      false: { backgroundColor: "surface.sunken", opacity: 0.6 },
    },
  },
  defaultVariants: { selected: true },
});

export const td = cva({
  base: { px: "3", py: "2", verticalAlign: "middle" },
  variants: {
    align: {
      start: { textAlign: "left" },
      center: { textAlign: "center" },
      end: { textAlign: "right" },
    },
    muted: { true: { color: "text.muted", fontVariantNumeric: "tabular-nums" }, false: {} },
  },
  defaultVariants: { align: "start", muted: false },
});

export const footer = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const footerActions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});
