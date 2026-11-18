import { cva } from "../../../styled-system/css";

export const dialogOverlayRecipe = cva({
  base: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    // Ends at the top of the on-screen keyboard (useVisualViewportInset), so the bottom-anchored
    // dialog sits above it and the page behind never has to pan to show a field.
    bottom: "var(--keyboard-inset, 0px)",
    backgroundColor: "surface.scrim",
    // Above MobileBottomBar (80), the nav drawer (90/100) and every token layer, so a dialog is never covered.
    zIndex: 200,
    display: "flex",
    // One rule with Sheet (STYLE-GUIDE "Dialog or sheet"): under md every modal rises from the
    // bottom of the screen; from md a dialog is centred.
    alignItems: { base: "flex-end", md: "center" },
    justifyContent: "center",
    padding: { base: "0", md: "4" },
  },
});

export const dialogContentRecipe = cva({
  base: {
    backgroundColor: "surface.overlay",
    color: "text.primary",
    borderRadius: { base: "0", md: "tray" },
    borderTopLeftRadius: "tray",
    borderTopRightRadius: "tray",
    border: "1px solid",
    borderColor: "border.subtle",
    borderBottomWidth: { base: "0", md: "1px" },
    boxShadow: "overlay",
    width: "100%",
    // Dynamic viewport units: on a phone `vh` counts the area under the browser's toolbars, so a
    // tall dialog's last field and actions sat behind the toolbar and the bottom bar (R2-8).
    // With the keyboard open, no taller than what can be seen above it.
    maxHeight: {
      base: "min(94dvh, calc(var(--visual-viewport-height, 100dvh) * 0.94))",
      md: "min(85dvh, calc(var(--visual-viewport-height, 100dvh) * 0.85))",
    },
    overflowY: "auto",
    padding: { base: "5", md: "7" },
    // Phone: clear of the home indicator, like a bottom sheet.
    paddingBottom: { base: "calc({spacing.5} + env(safe-area-inset-bottom, 0px))", md: "7" },
    display: "flex",
    flexDirection: "column",
    gap: "5",
    outline: "none",
    _motionSafe: {
      animationName: { base: "slideUp", md: "scaleIn" },
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
  variants: {
    size: {
      // Full width as a phone bottom sheet; the size applies from md.
      sm: { maxWidth: { base: "100%", md: "400px" } },
      md: { maxWidth: { base: "100%", md: "480px" } },
      lg: { maxWidth: { base: "100%", md: "640px" } },
    },
  },
  defaultVariants: { size: "md" },
});

export const dialogHeaderRecipe = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const dialogTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const dialogDescriptionRecipe = cva({
  base: { textStyle: "body.sm", color: "text.muted", marginTop: "1", marginBottom: 0 },
});

/** Footer action row: primary last on desktop, stacked full width (primary on top) on a phone. */
export const dialogFooterRecipe = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    justifyContent: "flex-end",
    gap: "3",
    marginTop: "2",
    "& > *": { width: { base: "100%", sm: "auto" } },
  },
});

export const dialogCloseRecipe = cva({
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
