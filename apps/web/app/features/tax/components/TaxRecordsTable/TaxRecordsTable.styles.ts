import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const filters = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "3",
    alignItems: "end",
  },
});

export const summary = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const nameButton = cva({
  base: {
    display: "inline",
    padding: 0,
    border: "none",
    background: "none",
    color: "text.primary",
    textStyle: "body.md",
    fontWeight: "medium",
    textAlign: "left",
    cursor: "pointer",
    textDecoration: "underline",
    textDecorationColor: "border.strong",
    textUnderlineOffset: "3px",
    _hover: { color: "primary", textDecorationColor: "primary" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
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
      danger: { _hover: { backgroundColor: "status.danger.bg", color: "status.danger.text" } },
    },
  },
  defaultVariants: { tone: "default" },
});

export const pager = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const pagerButtons = cva({
  base: { display: "inline-flex", gap: "2" },
});
