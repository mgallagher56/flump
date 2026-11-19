import { cva } from "@repo/ui/styled-system/css";

export const widgetCard = cva({
  base: {
    position: "relative",
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderTopWidth: "4px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    height: "100%",
    _motionSafe: {
      transitionProperty: "border-color, box-shadow",
      transitionDuration: "fast",
    },
  },
  variants: {
    // Every card has the same 4px top edge in its section's colour, so none looks unfinished.
    // Before, the edge came from the domain map: teal and sage were solid, apricot used its pale
    // tint (so the debt card looked edgeless) and pay and tax fell back to grey. These are the
    // chart series colours (at least 3:1 on the card in both themes) and the damson accent.
    colour: {
      teal: { borderTopColor: "chart.series1" },
      sage: { borderTopColor: "chart.series2" },
      apricot: { borderTopColor: "chart.series3" },
      violet: { borderTopColor: "chart.series4" },
      sky: { borderTopColor: "chart.series6" },
      rose: { borderTopColor: "chart.series5" },
      damson: { borderTopColor: "accent" },
    },
    interactive: {
      true: {
        cursor: "pointer",
        // The top edge keeps its section colour on hover.
        _hover: {
          borderLeftColor: "border.strong",
          borderRightColor: "border.strong",
          borderBottomColor: "border.strong",
          boxShadow: "raised",
        },
        // One ring, on the card, and only for keyboard focus on its stretched link.
        "&:has(a:focus-visible)": {
          outlineWidth: "2px",
          outlineStyle: "solid",
          outlineColor: "border.focusRing",
          outlineOffset: "2px",
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    colour: "teal",
    interactive: false,
  },
});

export const widgetHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    marginBottom: "4px",
  },
});

export const widgetTitle = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    minWidth: 0,
    overflowWrap: "anywhere",
  },
});

export const widgetLabel = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: 0 },
});

export const widgetFigure = cva({
  base: {
    textStyle: "numeric.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
    overflowWrap: "anywhere",
  },
});

/** "Not set": body size, muted, never larger or heavier than a real value (E16 P3.1). */
export const widgetUnset = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const widgetLine = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, flex: 1 },
});

export const widgetFooter = cva({
  base: { display: "flex", alignItems: "center", marginTop: "4px", marginLeft: "-8px" },
});

export const widgetLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    paddingX: "8px",
    minHeight: "32px",
    borderRadius: "md",
    textStyle: "label.md",
    color: "primary",
    textDecoration: "none",
    "&::after": {
      content: '""',
      position: "absolute",
      inset: "0",
    },
    _hover: {
      textDecoration: "underline",
      textUnderlineOffset: "3px",
    },
    // The card draws the focus ring (see widgetCard), so the link draws none of its own.
    _focusVisible: { outline: "none" },
  },
});

export const widgetLock = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    paddingX: "8px",
    minHeight: "32px",
    color: "text.secondary",
  },
});
