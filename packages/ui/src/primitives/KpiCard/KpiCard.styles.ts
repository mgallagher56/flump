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
    height: "100%",
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
      hero: { color: "text.onContrast" },
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

export const kpiHeroValue = cva({
  base: {
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    margin: "0",
    minWidth: 0,
    overflowWrap: "anywhere",
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

/** The figure scales with the card so a long value stays on one line, even at 375px in a 2x2 strip. */
export const kpiMoney = cva({
  base: {
    minWidth: 0,
    // Digits never wrap: the size follows the card width (container query units), 16px to 32px.
    fontSize: "clamp(1rem, 12cqi, 2rem)",
  },
});
