import { cva } from "@repo/ui/styled-system/css";

export const bar = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
    minWidth: 0,
  },
});

export const yearGroup = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "2",
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: "none",
  },
});

export const label = cva({
  base: { textStyle: "label.md", color: "text.secondary", marginRight: "1" },
});

export const chip = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "density.control.sm",
    px: "4",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    textStyle: "label.md",
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    selected: {
      true: {
        backgroundColor: "primary.solid",
        borderColor: "primary.solid",
        color: "primary.foreground",
      },
      false: {
        backgroundColor: "surface.card",
        borderColor: "border",
        color: "text.secondary",
        _hover: { borderColor: "border.strong", color: "text.primary" },
      },
    },
  },
});

export const actions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});

export const iconButton = cva({
  base: { gap: "2" },
});
