import { cva } from "../../../styled-system/css";

export const navDrawerBackdrop = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.scrim",
    zIndex: 90,
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

export const navDrawerPanel = cva({
  base: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    height: "100vh",
    maxHeight: "100dvh",
    width: "85%",
    maxWidth: "320px",
    backgroundColor: "surface.card",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "border.subtle",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 16px",
    boxShadow: "overlay",
    overflowY: "auto",
    _motionSafe: {
      animationName: "slideInRight",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

export const navDrawerHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "4",
    marginBottom: "4",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

const navDrawerInteractive = {
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  backgroundColor: "surface.canvas",
  color: "text.primary",
  _motionSafe: {
    transitionProperty: "border-color, color",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
  },
  _hover: { borderColor: "primary.border", color: "primary" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
} as const;

export const navDrawerClose = cva({
  base: {
    ...navDrawerInteractive,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "lg",
    cursor: "pointer",
  },
});

export const navDrawerBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const navDrawerFooter = cva({
  base: {
    marginTop: "6",
    paddingTop: "4",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

/** A full-width link row inside the drawer (44px tall). */
export const navDrawerLink = cva({
  base: {
    ...navDrawerInteractive,
    display: "flex",
    alignItems: "center",
    gap: "3",
    minHeight: "44px",
    padding: "12px 16px",
    borderRadius: "lg",
    textDecoration: "none",
    textStyle: "label.md",
  },
});
