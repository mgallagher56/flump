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
    bottom: "0",
    maxHeight: "90vh",
    borderTopLeftRadius: "tray",
    borderTopRightRadius: "tray",
    borderBottomWidth: "0",
    paddingTop: "3",
    paddingX: "5",
    paddingBottom: "calc({spacing.5} + env(safe-area-inset-bottom, 0px))",
    "@supports (height: 1dvh)": { maxHeight: "90dvh" },
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
          paddingX: "7",
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
          paddingTop: "7",
          paddingX: "7",
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

/** Grab handle: decorative, shown for the bottom-sheet presentation only. */
export const sheetHandleRecipe = cva({
  base: {
    alignSelf: "center",
    width: "10",
    height: "1",
    borderRadius: "full",
    backgroundColor: "border.strong",
    flexShrink: 0,
  },
  variants: {
    side: {
      bottom: {},
      right: { md: { display: "none" } },
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

/** The only scrolling region, so the header and footer stay put. */
export const sheetBodyRecipe = cva({
  base: {
    flex: "1 1 auto",
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
