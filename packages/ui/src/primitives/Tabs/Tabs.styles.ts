import { cva } from "../../../styled-system/css";

/** The root never grows past its parent, so a long tab list scrolls instead of widening the page. */
export const tabsRoot = cva({
  base: { minWidth: "0", maxWidth: "100%" },
});

/**
 * Segmented track. At 375px a list wider than its parent scrolls sideways inside itself
 * (`overflowX: auto`) rather than overflowing the page.
 */
export const tabsList = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "surface.sunken",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    maxWidth: "100%",
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    scrollbarWidth: "thin",
  },
  variants: {
    size: {
      sm: { padding: "2px", gap: "2px" },
      md: { padding: "4px", gap: "4px" },
    },
  },
  defaultVariants: { size: "md" },
});

export const tabPanel = cva({
  base: {
    marginTop: "4",
    borderRadius: "lg",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    // Radix keeps a force-mounted panel visible, so hide inactive ones here (out of the a11y tree).
    keepMounted: {
      true: { "&[data-state='inactive']": { display: "none" } },
      false: {},
    },
  },
  defaultVariants: { keepMounted: false },
});

export const tabTrigger = cva({
  base: {
    display: "inline-flex",
    flexShrink: "0",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    fontWeight: "semibold",
    color: "text.muted",
    backgroundColor: "transparent",
    borderRadius: "lg",
    border: "none",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color, box-shadow",
      transitionDuration: "base",
      transitionTimingFunction: "standard",
    },
    "&[data-state='active']": {
      backgroundColor: "surface.card",
      color: "text.primary",
      boxShadow: "xs",
    },
    _hover: {
      color: "text.primary",
    },
    _disabled: { cursor: "not-allowed", opacity: 0.5 },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: {
    size: {
      sm: { minHeight: "28px", paddingBlock: "1", paddingInline: "3", fontSize: "xs" },
      // The original SegmentedTabs look, so existing screens do not shift.
      md: { minHeight: "36px", paddingBlock: "2", paddingInline: "4", fontSize: "xs" },
    },
  },
  defaultVariants: { size: "md" },
});
