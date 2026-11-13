import { cva } from "@repo/ui/styled-system/css";

export const navBar = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "surface.card",
    padding: "8px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
    overflowX: "auto",
    maxWidth: "100%",
  },
});

export const navGroup = cva({
  base: { display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 },
});

export const navDivider = cva({
  base: {
    width: "1px",
    height: "24px",
    backgroundColor: "border.subtle",
    flexShrink: 0,
    marginX: "4px",
  },
});

export const navButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    minHeight: "36px",
    paddingX: "14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: "text.secondary",
    textStyle: "label.md",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
    _hover: { backgroundColor: "surface.subtle", color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: "primary.subtle",
        borderColor: "primary.border",
        color: "text.primary",
        fontWeight: "semibold",
      },
      false: {},
    },
    kind: {
      view: {},
      category: {},
      add: {
        borderStyle: "dashed",
        borderColor: "primary.border",
        color: "primary",
      },
    },
  },
  defaultVariants: { active: false, kind: "view" },
});
