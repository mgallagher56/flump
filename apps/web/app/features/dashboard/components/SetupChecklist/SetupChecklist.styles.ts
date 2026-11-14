import { cva } from "@repo/ui/styled-system/css";

export const panel = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    minWidth: 0,
  },
});

export const header = cva({
  base: { display: "flex", alignItems: "center", gap: "4px", paddingRight: "8px" },
});

export const headingWrap = cva({
  base: { margin: 0, flex: 1, minWidth: 0, textStyle: "label.md" },
});

export const toggle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    width: "100%",
    minHeight: "44px",
    paddingX: "16px",
    paddingY: "10px",
    background: "transparent",
    border: "none",
    color: "text.primary",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "card",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const toggleText = cva({
  base: { textStyle: "label.md", color: "text.primary", minWidth: 0 },
});

export const dismissButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    flexShrink: 0,
    background: "transparent",
    border: "none",
    color: "text.secondary",
    borderRadius: "control",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const stepList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: { base: "4px 16px 16px", md: "4px 16px 16px" },
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    paddingTop: "12px",
  },
});

export const stepItem = cva({
  base: { display: "flex", gap: "10px", alignItems: "flex-start", minWidth: 0 },
});

export const statusIcon = cva({
  base: { display: "inline-flex", color: "text.secondary", paddingTop: "2px", flexShrink: 0 },
});

export const stepBody = cva({
  base: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" },
});

export const stepLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const stepDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});
