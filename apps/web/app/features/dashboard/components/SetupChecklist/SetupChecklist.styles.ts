import { cva } from "@repo/ui/styled-system/css";

export const panel = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    minWidth: "0",
  },
});

export const header = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "3",
    paddingX: "4",
    paddingY: "3",
  },
});

export const headingWrap = cva({
  base: { margin: "0", flex: "1 1 180px", minWidth: "0", textStyle: "label.md" },
});

export const toggle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    width: "100%",
    minHeight: "touch",
    padding: "0",
    background: "transparent",
    border: "none",
    color: "text.primary",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "control",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const toggleMeta = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: "0" },
});

export const toggleText = cva({
  base: { textStyle: "label.md", color: "text.primary", minWidth: "0" },
});

export const toggleNext = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontWeight: "normal", minWidth: "0" },
});

export const dismissButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "touch",
    height: "touch",
    flexShrink: "0",
    background: "transparent",
    border: "none",
    color: "text.secondary",
    borderRadius: "control",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const stepListWrap = cva({
  base: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    padding: "4",
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const stepList = cva({
  base: {
    listStyle: "none",
    margin: "0",
    padding: "0",
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    gap: "3",
  },
});

export const stepItem = cva({
  base: {
    display: "flex",
    gap: "2.5",
    alignItems: "flex-start",
    minWidth: "0",
    padding: "3",
    borderRadius: "control",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
  variants: {
    state: {
      next: {
        gridColumn: { base: "auto", md: "1 / -1" },
        borderColor: "primary.border",
        backgroundColor: "surface.subtle",
      },
      todo: {},
      done: {
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
    },
  },
  defaultVariants: {
    state: "todo",
  },
});

export const statusIcon = cva({
  base: { display: "inline-flex", paddingTop: "0.5", flexShrink: "0" },
  variants: {
    done: {
      true: { color: "status.positive.text" },
      false: { color: "text.secondary" },
    },
  },
  defaultVariants: { done: false },
});

export const stepBody = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "1.5",
    minWidth: "0",
  },
});

export const stepLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const stepDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const stepActions = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", paddingTop: "1" },
});

export const finishRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3.5",
    paddingX: "4",
    paddingY: "3",
  },
});

export const finishIllustration = cva({
  base: { width: "11", height: "11", flexShrink: "0", display: "block" },
});

export const finishCopy = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", flex: "1", minWidth: "0" },
});

export const finishHeading = cva({
  base: { margin: "0", textStyle: "label.md", color: "text.primary" },
});

export const finishBody = cva({
  base: { margin: "0", textStyle: "body.sm", color: "text.secondary" },
});
