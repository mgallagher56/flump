import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
    minWidth: 0,
  },
});

export const group = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const groupHeader = cva({
  base: { display: "flex", alignItems: "center", gap: "8px" },
});

export const groupTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
});

export const accountLink = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    textDecoration: "underline",
    textDecorationColor: "border.strong",
    textUnderlineOffset: "3px",
    borderRadius: "sm",
    overflowWrap: "anywhere",
    _hover: { color: "primary", textDecorationColor: "currentColor" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const typeCell = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const mutedText = cva({
  base: { color: "text.muted", textStyle: "body.sm" },
});

/** A total line under a table. A real top border, so it survives forced colours. */
export const totalRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "16px",
    margin: 0,
    paddingBlock: "16px",
    paddingInline: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    fontVariantNumeric: "tabular-nums",
    "& dd": { margin: 0 },
  },
  variants: {
    emphasis: { true: { borderTopWidth: 0 } },
  },
});

export const totalLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
  variants: {
    emphasis: { true: { textStyle: "heading.sm" } },
  },
});

export const note = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "65ch" },
});
