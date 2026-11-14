import { cva } from "../../../styled-system/css";

/**
 * Distance kept clear above sticky elements for an app header. A page or the app shell sets
 * `--app-header-offset` (for example `css({ "--app-header-offset": "64px" })` on a wrapper); it
 * falls back to 0 so the layout works without a header.
 */
const headerOffset = "var(--app-header-offset, 0px)";

export const splitGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "repeat(12, minmax(0, 1fr))" },
    gap: { base: "4", lg: "6" },
    alignItems: "start",
    width: "100%",
  },
});

/** Under `lg`: the summary bar that keeps the headline outcome visible, plus the Adjust control. */
export const splitSummaryBar = cva({
  base: {
    display: { base: "flex", lg: "none" },
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    position: "sticky",
    top: headerOffset,
    zIndex: "sticky",
    px: "4",
    py: "3",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "2xl",
    boxShadow: "card",
    fontVariantNumeric: "tabular-nums",
  },
});

export const splitSummaryText = cva({
  base: { flex: "1 1 auto", minWidth: 0, color: "text.primary", textStyle: "body.md" },
});

export const splitAdjustButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    flexShrink: 0,
    minHeight: "touch",
    px: "4",
    textStyle: "label.md",
    fontWeight: "semibold",
    color: "primary.foreground",
    backgroundColor: "primary.solid",
    borderRadius: "full",
    border: "none",
    cursor: "pointer",
    _hover: { backgroundColor: "primary.hover" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const splitLeftControls = cva({
  base: {
    gridColumn: { base: "span 1", lg: "span 5" },
    flexDirection: "column",
    gap: "4",
    display: "flex",
    // No max height or inner scroll: a capped column clipped its last cards behind a scrollbar
    // most people never noticed. Every card stays in normal flow at its full height.
    alignSelf: "start",
  },
  variants: {
    span: {
      4: { gridColumn: { base: "span 1", lg: "span 4" } },
      5: { gridColumn: { base: "span 1", lg: "span 5" } },
    },
    // Sticky from lg only while the column fits below the header (measured in the component).
    // A taller column scrolls with the page, so its bottom controls are always reachable.
    sticky: {
      true: {
        position: { lg: "sticky" },
        top: { lg: `calc(${headerOffset} + token(spacing.4))` },
      },
      false: {},
    },
    // Under lg, with a summary bar, the controls stay hidden until Adjust is pressed.
    collapsed: {
      true: { display: { base: "none", lg: "flex" } },
      false: {},
    },
  },
  defaultVariants: {
    span: 5,
    sticky: true,
    collapsed: false,
  },
});

export const splitRightContent = cva({
  base: {
    gridColumn: { base: "span 1", lg: "span 7" },
    display: "flex",
    flexDirection: "column",
    gap: "5",
    minWidth: 0,
  },
  variants: {
    span: {
      7: { gridColumn: { base: "span 1", lg: "span 7" } },
      8: { gridColumn: { base: "span 1", lg: "span 8" } },
    },
  },
  defaultVariants: {
    span: 7,
  },
});
