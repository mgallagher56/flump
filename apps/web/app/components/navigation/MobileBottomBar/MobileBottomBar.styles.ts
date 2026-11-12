import { cva } from "@repo/ui/styled-system/css";

export const bar = cva({
  base: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 80,
    alignItems: "center",
    justifyContent: "space-around",
    height: "calc(64px + env(safe-area-inset-bottom, 0px))",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    backgroundColor: "surface.overlay",
    backdropFilter: "blur(12px)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    boxShadow: "raised",
  },
  variants: {
    forceMobile: {
      true: { display: "flex" },
      false: { display: { base: "flex", md: "none" } },
    },
  },
  defaultVariants: { forceMobile: false },
});

export const tab = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1",
    flex: 1,
    height: "100%",
    minHeight: "48px",
    textStyle: "label.sm",
    textDecoration: "none",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "text.muted",
    _motionSafe: {
      transitionProperty: "color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: {
    active: { true: { color: "primary", fontWeight: "semibold" }, false: {} },
  },
  defaultVariants: { active: false },
});
