import { cva } from "../../../styled-system/css";

export const sheetOverlayRecipe = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.scrim",
    // Same layer as Dialog: above MobileBottomBar (80) and the nav drawer (90/100).
    zIndex: 200,
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

export const sheetContentRecipe = cva({
  base: {
    position: "fixed",
    zIndex: 201,
    display: "flex",
    flexDirection: "column",
    gap: "4",
    backgroundColor: "surface.overlay",
    color: "text.primary",
    border: "1px solid",
    borderColor: "border.subtle",
    boxShadow: "overlay",
    outline: "none",
    // Phone: a bottom sheet with a safe-area inset below the last row.
    left: "0",
    right: "0",
    // On top of the on-screen keyboard (useVisualViewportInset), not under it.
    bottom: "var(--keyboard-inset, 0px)",
    // Older browsers without dvh still get the keyboard cap.
    maxHeight: "min(90vh, calc(var(--visual-viewport-height, 100vh) * 0.9))",
    borderTopLeftRadius: "tray",
    borderTopRightRadius: "tray",
    borderBottomWidth: "0",
    // As tall as its content (up to the cap), with no fake grab handle (phone audit P31).
    height: "auto",
    paddingTop: "5",
    // Clear the notch at the sides on a phone held sideways (phone audit P15).
    paddingLeft: "max({spacing.5}, env(safe-area-inset-left, 0px))",
    paddingRight: "max({spacing.5}, env(safe-area-inset-right, 0px))",
    paddingBottom: "calc({spacing.5} + env(safe-area-inset-bottom, 0px))",
    "@supports (height: 1dvh)": {
      maxHeight: "min(90dvh, calc(var(--visual-viewport-height, 100dvh) * 0.9))",
    },
    _motionSafe: {
      animationName: "slideUp",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
  variants: {
    side: {
      // Bottom at every width; from md it is a centred sheet.
      bottom: {
        md: {
          // No transform: the enter animation owns it.
          left: "0",
          right: "0",
          marginX: "auto",
          width: "100%",
          maxWidth: "640px",
          paddingLeft: "7",
          paddingRight: "7",
        },
      },
      // Bottom sheet under md, side sheet from md.
      right: {
        md: {
          left: "auto",
          top: "0",
          bottom: "0",
          right: "0",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "none",
          borderRadius: "0",
          borderTopLeftRadius: "tray",
          borderBottomLeftRadius: "tray",
          borderBottomWidth: "1px",
          // Below the notch and clear of it at the right edge, held sideways (phone audit P15).
          paddingTop: "max({spacing.7}, env(safe-area-inset-top, 0px))",
          paddingLeft: "7",
          paddingRight: "max({spacing.7}, env(safe-area-inset-right, 0px))",
          paddingBottom: "calc({spacing.7} + env(safe-area-inset-bottom, 0px))",
          _motionSafe: {
            animationName: "slideInRight",
          },
        },
      },
    },
  },
  defaultVariants: { side: "bottom" },
});

export const sheetHeaderRecipe = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "3",
    flexShrink: 0,
  },
});

export const sheetTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const sheetDescriptionRecipe = cva({
  base: { textStyle: "body.sm", color: "text.muted", marginTop: "1", marginBottom: 0 },
});

/**
 * The only scrolling region, so the header and footer stay put. It shrinks to fit the height cap
 * but never grows past its content, so there is no empty band under the buttons.
 */
export const sheetBodyRecipe = cva({
  base: {
    flex: "0 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
});

export const sheetFooterRecipe = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    justifyContent: "flex-end",
    gap: "3",
    flexShrink: 0,
    "& > *": { width: { base: "100%", sm: "auto" } },
  },
});

export const sheetCloseRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    minHeight: "44px",
    margin: "-2.5",
    background: "none",
    border: "none",
    color: "text.muted",
    cursor: "pointer",
    borderRadius: "md",
    flexShrink: 0,
    _hover: { color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
