import { cva } from "../../../styled-system/css";

export const menuContentRecipe = cva({
  base: {
    zIndex: 250,
    minWidth: "200px",
    maxWidth: "min(320px, calc(100vw - 32px))",
    backgroundColor: "surface.overlay",
    color: "text.primary",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border.subtle",
    boxShadow: "overlay",
    padding: "1.5",
    outline: "none",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "fast",
      animationTimingFunction: "enter",
    },
  },
});

export const menuItemRecipe = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
    minHeight: "40px",
    paddingX: "3",
    paddingY: "2",
    borderRadius: "lg",
    textStyle: "body.sm",
    color: "text.primary",
    cursor: "pointer",
    userSelect: "none",
    outline: "none",
    "&[data-highlighted]": { backgroundColor: "surface.subtle" },
    "&[data-disabled]": { color: "text.muted", cursor: "not-allowed", opacity: 0.6 },
    "@media (pointer: coarse)": { minHeight: "44px" },
  },
  variants: {
    tone: {
      default: {},
      danger: {
        color: "status.danger.text",
        "&[data-highlighted]": { backgroundColor: "status.danger.bg" },
      },
    },
  },
  defaultVariants: { tone: "default" },
});

export const menuItemLabelRecipe = cva({
  base: { flex: 1, minWidth: 0 },
});

export const menuShortcutRecipe = cva({
  base: {
    color: "text.muted",
    textStyle: "label.sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const menuSeparatorRecipe = cva({
  base: { height: "1px", backgroundColor: "border.subtle", marginY: "1.5", marginX: "1" },
});

export const menuGroupLabelRecipe = cva({
  base: {
    paddingX: "3",
    paddingY: "1.5",
    textStyle: "label.sm",
    color: "text.muted",
  },
});
