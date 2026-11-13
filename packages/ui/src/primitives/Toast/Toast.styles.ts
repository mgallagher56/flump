import { cva } from "../../../styled-system/css";

/**
 * Bottom-centre on phone, bottom-right from md. Sits above Dialog (200) so a confirmation raised
 * from inside a dialog stays visible. The wrapper ignores pointer events; each toast re-enables them.
 */
export const toastViewportRecipe = cva({
  base: {
    position: "fixed",
    zIndex: 210,
    display: "flex",
    flexDirection: "column",
    gap: "2",
    margin: "0",
    padding: "0",
    listStyle: "none",
    pointerEvents: "none",
    left: "4",
    right: "4",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
    alignItems: "center",
    md: {
      left: "auto",
      right: "calc(env(safe-area-inset-right, 0px) + 1.5rem)",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
      alignItems: "flex-end",
    },
  },
});

export const toastRecipe = cva({
  base: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    width: "100%",
    maxWidth: "26rem",
    paddingBlock: "3",
    paddingInline: "4",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    backgroundColor: "surface.overlay",
    color: "text.primary",
    boxShadow: "overlay",
    fontSize: "sm",
    lineHeight: "1.5",
    _motionSafe: {
      animationName: "slideUp",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
  variants: {
    tone: {
      neutral: { borderColor: "border" },
      info: { borderColor: "status.info.border" },
      positive: { borderColor: "status.positive.border" },
      warning: { borderColor: "status.warning.border" },
      danger: { borderColor: "status.danger.border" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const toastIconRecipe = cva({
  base: { flexShrink: 0, display: "inline-flex", marginTop: "0.5" },
  variants: {
    tone: {
      neutral: { color: "status.neutral.text" },
      info: { color: "status.info.text" },
      positive: { color: "status.positive.text" },
      warning: { color: "status.warning.text" },
      danger: { color: "status.danger.text" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const toastBodyRecipe = cva({
  base: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1" },
});

export const toastTitleRecipe = cva({
  base: { margin: "0", fontWeight: "semibold" },
});

export const toastDescriptionRecipe = cva({
  base: { margin: "0", color: "text.secondary" },
});

export const toastActionRecipe = cva({
  base: { marginTop: "1", display: "flex", gap: "2" },
});

export const toastDismissRecipe = cva({
  base: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    marginBlock: "-3",
    marginInlineEnd: "-3",
    borderRadius: "md",
    border: "none",
    backgroundColor: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle", color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
