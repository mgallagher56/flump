import { sva } from "../../../styled-system/css";

export const selectRecipe = sva({
  slots: ["root", "select", "chevron"],
  base: {
    root: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "100%",
      minWidth: 0,
    },
    select: {
      appearance: "none",
      width: "100%",
      minWidth: 0,
      pl: "density.controlPadX",
      pr: "10",
      backgroundColor: "surface.subtle",
      borderWidth: "1.5px",
      borderStyle: "solid",
      borderColor: "border.input",
      borderRadius: "lg",
      color: "text.primary",
      textStyle: "body.md",
      fontVariantNumeric: "tabular-nums",
      cursor: "pointer",
      textOverflow: "ellipsis",
      _motionSafe: {
        transitionProperty: "border-color, background-color",
        transitionDuration: "fast",
        transitionTimingFunction: "standard",
      },
      _hover: { borderColor: "border.strong" },
      _focusVisible: {
        backgroundColor: "surface.card",
        borderColor: "border.focusRing",
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "border.focusRing",
        outlineOffset: "1px",
      },
      "&[aria-invalid=true]": { borderColor: "status.danger.solid" },
      _disabled: {
        backgroundColor: "surface.sunken",
        color: "text.muted",
        cursor: "not-allowed",
      },
    },
    chevron: {
      position: "absolute",
      right: "3.5",
      display: "inline-flex",
      pointerEvents: "none",
      color: "text.secondary",
    },
  },
  variants: {
    size: {
      sm: {
        select: {
          minHeight: "density.control.md",
          "@media (pointer: coarse)": { minHeight: "touch" },
        },
      },
      md: {
        select: {
          minHeight: "density.control.lg",
          "@media (pointer: coarse)": { minHeight: "touch" },
        },
      },
    },
  },
  defaultVariants: { size: "md" },
});
