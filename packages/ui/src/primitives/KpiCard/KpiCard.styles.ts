import { cva } from "../../../styled-system/css";

export const kpiCardContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    p: "density.cardPad",
    containerType: "inline-size",
    display: "flex",
    flexDirection: "column",
    // Top-aligned so the value sits at the same height in every card of a strip (known #15).
    justifyContent: "flex-start",
    gap: "density.gap",
    // Fills the strip row (the grid stretches its items), so every card in a strip is as tall as
    // the tallest one and the caption is pinned to the bottom (R2-2).
    height: "100%",
    alignSelf: "stretch",
    minWidth: 0,
    boxShadow: "card",
  },
  variants: {
    /** `hero`: the single deep-teal headline block per page (`surface.hero`). */
    tone: {
      default: {},
      hero: {
        backgroundColor: "surface.hero",
        borderColor: "surface.hero",
        color: "text.onContrast",
        // border.focusRing is under 3:1 on the light hero, so descendants use the label colour.
        "& :focus-visible": { outlineColor: "text.onContrast" },
      },
    },
  },
  defaultVariants: { tone: "default" },
});

export const kpiEyebrow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
  },
});

export const kpiLabel = cva({
  base: {
    textStyle: "label.sm",
    color: "text.muted",
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  variants: {
    tone: {
      default: {},
      hero: {
        color: "text.onContrast",
        // The explain InfoTip trigger defaults to text.muted, which fails on surface.hero. The
        // type and attribute outrank the trigger's doubled class; the open state keeps its own.
        "& button[aria-haspopup]:not([data-state='open'])": { color: "text.onContrast" },
      },
    },
  },
  defaultVariants: { tone: "default" },
});

export const kpiValueRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "2",
  },
});

/**
 * The one value style for every KPI, whatever the value is (a number through `Money`, a date, a
 * string or any node), so a strip never mixes sizes (R2-2). Long values wrap; they never grow.
 */
export const kpiHeroValue = cva({
  base: {
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    margin: "0",
    minWidth: 0,
    maxWidth: "100%",
    // Words ("December 2029") wrap at spaces; a word longer than the card breaks only as a last
    // resort. A money figure never splits: "£1,234,5" over "67" would read as two figures.
    overflowWrap: "break-word",
    // A page may pass a node that sets its own size (`<Num size="lg">` on mortgage made "4.50%"
    // smaller than "£1,250"). Everything inside the slot takes the slot's type; the doubled
    // class outranks a child's single size class.
    "&& *": {
      fontFamily: "inherit",
      fontSize: "inherit",
      fontWeight: "inherit",
      lineHeight: "inherit",
      letterSpacing: "inherit",
    },
  },
  variants: {
    tone: {
      default: {},
      hero: { color: "text.onContrast" },
    },
  },
  defaultVariants: { tone: "default" },
});

export const kpiSubtext = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: "0",
    pt: "1",
    // Pinned to the bottom of the card, so captions line up across a strip of uneven content.
    mt: "auto",
  },
  variants: {
    tone: {
      default: {},
      hero: { color: "text.onContrast" },
    },
  },
  defaultVariants: { tone: "default" },
});

/**
 * Wraps the shared `Skeleton` (E16 P12: one skeleton primitive). The text skeleton is 1em tall, so
 * the KPI value text style sizes it to the value it stands in for.
 */
export const kpiLoadingBar = cva({
  base: { width: "60%", textStyle: "numeric.kpi" },
});

/** E16 P3.1: "Not set" in `numeric.unset`, muted, never larger or heavier than a real value. */
export const kpiNotSet = cva({
  base: {
    textStyle: "numeric.unset",
    color: "text.muted",
    margin: "0",
  },
});

/** The one action under "Not set". */
export const kpiNotSetAction = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
    textStyle: "body.sm",
  },
});

/** The delta badge row, below the value so the value baseline never moves. */
export const kpiDeltaRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
  },
});

export const kpiDeltaContent = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * A numeric value inside the KPI value slot. It takes its size from the slot (`numeric.kpi`), so
 * a money value is the same size as a date or a word beside it (R2-2). It no longer scales with
 * the card: a value too long for a narrow card wraps instead.
 */
export const kpiMoney = cva({
  base: {
    minWidth: 0,
    maxWidth: "100%",
    textStyle: "numeric.kpi",
    // One figure, one line (see kpiHeroValue).
    whiteSpace: "nowrap",
  },
});
