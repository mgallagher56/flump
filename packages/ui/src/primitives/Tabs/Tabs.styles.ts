import { cva } from "../../../styled-system/css";

/** The root never grows past its parent, so a long tab list scrolls instead of widening the page. */
export const tabsRoot = cva({
  base: { minWidth: "0", maxWidth: "100%" },
});

/**
 * Holds the track and scrolls it sideways when it is wider than the space it has (375px with four
 * tabs). `contain: inline-size` stops the track's width counting towards its ancestors' minimum
 * width, so a grid or flex parent can never be pushed wider than the page by a long tab list. As a
 * block it takes its parent's full width; the triggers' focus ring is drawn inside the trigger
 * (`outlineOffset: -2px`), so the scroll clip never cuts it.
 *
 * Scroll cue: when tabs are hidden past an edge, Tabs sets `data-overflow-start` or
 * `data-overflow-end` and that edge fades out through a mask, so a clipped list reads as "more this
 * way". The mask is static (no animation), so it needs no reduced-motion handling.
 */
export const tabsScroller = cva({
  base: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    contain: "inline-size",
    overflowX: "auto",
    overflowY: "hidden",
    overscrollBehaviorX: "contain",
    scrollbarWidth: "thin",
    "--tabs-fade-start": "0px",
    "--tabs-fade-end": "0px",
    "&[data-overflow-start], &[data-overflow-end]": {
      maskImage:
        "linear-gradient(to right, transparent 0, black var(--tabs-fade-start), black calc(100% - var(--tabs-fade-end)), transparent 100%)",
    },
    "&[data-overflow-start]": { "--tabs-fade-start": "token(spacing.8, 2rem)" },
    "&[data-overflow-end]": { "--tabs-fade-end": "token(spacing.8, 2rem)" },
  },
});

/** Segmented track, as wide as its tabs; `tabsScroller` scrolls it when that is too wide. */
export const tabsList = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "top",
    backgroundColor: "surface.sunken",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
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
    // A tab focused by a mouse or touch shows no ring (see POINTER_FOCUS in Tabs.tsx).
    "&[data-pointer-focus]:focus-visible": { outline: "none" },
  },
  variants: {
    size: {
      // Both sizes use the 14px label step: 12px is below the label floor. `sm` (the ScenarioZone
      // tools row) has tighter side padding so a three-tool row ("Overpayment", "Rate change",
      // "Overpay or save") still fits the 343px a 375px screen leaves; a longer row scrolls in
      // `tabsScroller` with its edge fades. Targets stay touch-friendly: 32px (sm), 36px (md).
      sm: { minHeight: "32px", paddingBlock: "1", paddingInline: "2", fontSize: "sm" },
      md: { minHeight: "36px", paddingBlock: "2", paddingInline: "4", fontSize: "sm" },
    },
  },
  defaultVariants: { size: "md" },
});
