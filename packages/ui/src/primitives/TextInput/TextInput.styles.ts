import { sva } from "../../../styled-system/css";

export const textInputRecipe = sva({
  slots: ["root", "input", "adornment"],
  base: {
    root: {
      display: "flex",
      alignItems: "center",
      gap: "2",
      width: "100%",
      minWidth: 0,
      px: "density.controlPadX",
      backgroundColor: "surface.card",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "border.input",
      borderRadius: "md",
      color: "text.primary",
      _focusWithin: {
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "border.focusRing",
        outlineOffset: "1px",
      },
      "&[data-invalid=true]": { borderColor: "status.danger.solid" },
      "&[data-disabled=true]": { backgroundColor: "surface.sunken", color: "text.muted" },
    },
    input: {
      flex: "1",
      minWidth: 0,
      height: "100%",
      py: "density.controlPadY",
      borderWidth: "0",
      backgroundColor: "transparent",
      color: "inherit",
      textStyle: "body.md",
      fontVariantNumeric: "tabular-nums",
      outline: "none",
      _placeholder: { color: "text.muted" },
      _disabled: { cursor: "not-allowed" },
    },
    adornment: {
      display: "inline-flex",
      alignItems: "center",
      flexShrink: 0,
      textStyle: "body.md",
      fontVariantNumeric: "tabular-nums",
      color: "text.secondary",
    },
  },
  variants: {
    size: {
      sm: { root: { minHeight: "density.control.sm" } },
      md: {
        root: {
          minHeight: "density.control.md",
          "@media (pointer: coarse)": { minHeight: "touch" },
        },
      },
    },
  },
  defaultVariants: { size: "md" },
});
