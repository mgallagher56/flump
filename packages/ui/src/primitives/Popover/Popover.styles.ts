import { cva } from "../../../styled-system/css";

/**
 * Direction C overlay look: surface.overlay, soft large radius, floating shadow. Z-index sits above
 * Dialog (200) so a popover or menu opened inside a dialog is never covered.
 */
export const popoverContentRecipe = cva({
  base: {
    position: "relative",
    zIndex: 250,
    backgroundColor: "surface.overlay",
    color: "text.primary",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border.subtle",
    boxShadow: "overlay",
    padding: "4",
    display: "flex",
    flexDirection: "column",
    gap: "2",
    maxWidth: "min(360px, calc(100vw - 32px))",
    outline: "none",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "fast",
      animationTimingFunction: "enter",
    },
  },
  variants: {
    size: {
      sm: { width: "240px" },
      md: { width: "320px" },
    },
  },
  defaultVariants: { size: "md" },
});

export const popoverHeaderRecipe = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const popoverTitleRecipe = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const popoverBodyRecipe = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});

export const popoverCloseRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    flexShrink: 0,
    marginTop: "-1",
    marginRight: "-1",
    background: "none",
    border: "none",
    borderRadius: "full",
    color: "text.muted",
    cursor: "pointer",
    _hover: { color: "text.primary", backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "@media (pointer: coarse)": { width: "44px", height: "44px" },
  },
});
