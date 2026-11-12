import { cva } from "@repo/ui/styled-system/css";

export const themeToggleGroup = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    margin: "0",
    minWidth: "0",
    padding: "2px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.sunken",
  },
});

export const themeToggleOption = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "full",
    border: "none",
    backgroundColor: "transparent",
    color: "text.muted",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "&[aria-pressed='true']": {
      backgroundColor: "surface.card",
      color: "primary",
      boxShadow: "xs",
    },
    "@media (pointer: coarse)": {
      width: "44px",
      height: "44px",
    },
  },
});
