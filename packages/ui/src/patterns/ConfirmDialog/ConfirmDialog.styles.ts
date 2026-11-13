import { cva } from "../../../styled-system/css";

export const confirmOverlay = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.scrim",
    // Above MobileBottomBar (80), the nav drawer (90/100) and the Dialog layer.
    zIndex: 200,
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

/** Centred without a transform (inset + auto margins), so the enter animation owns `transform`. */
export const confirmContent = cva({
  base: {
    position: "fixed",
    inset: 0,
    margin: "auto",
    height: "fit-content",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "calc(100vw - 32px)",
    maxWidth: "440px",
    padding: { base: "5", sm: "7" },
    backgroundColor: "surface.overlay",
    borderRadius: "tray",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "overlay",
    color: "text.primary",
    zIndex: 201,
    outline: "none",
    _motionSafe: {
      animationName: "scaleIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

export const confirmTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const confirmDescription = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const confirmField = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const confirmInput = cva({
  base: {
    height: "control.md",
    px: "3",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    borderRadius: "control",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
  },
});

/** Primary last (right) from `sm`; stacked full width with the primary action on top on a phone. */
export const confirmActions = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    justifyContent: "flex-end",
    gap: "3",
    marginTop: "2",
    "& > *": { width: { base: "100%", sm: "auto" } },
  },
});

export const confirmError = cva({
  base: {
    margin: 0,
    px: "3",
    py: "2",
    textStyle: "body.sm",
    color: "status.danger.text",
    backgroundColor: "status.danger.bg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    borderRadius: "control",
  },
});
