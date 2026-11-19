import { cva } from "../../../styled-system/css";

export const kpiCardContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    p: "density.cardPad",
    // Not a size container itself: a container cannot be a subgrid, so the strip's shared label,
    // value and foot rows (P21) were lost and a label wrapped at large text ran over the value
    // (phone sweep 4). The value box below is the container for the value's size steps.
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

/**
 * The label row is one fixed line height (the 24px InfoTip trigger), so a card with an explain
 * tip or an action badge has its value on the same line as a card with neither (R2-8).
 */
export const kpiEyebrow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    minHeight: "6",
  },
});

export const kpiLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    minHeight: "6",
    textStyle: "label.sm",
    // Tabular numerals belong on the figure only: on label text they widen the gaps around a
    // hyphen ("Debt-free date"), even when the card sits inside a tabular table (phone audit P42).
    fontVariantNumeric: "normal",
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

/** Holds the `action` badge at the label row's height, so a badge never makes the row taller. */
export const kpiAction = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flex: "none",
    height: "6",
  },
});

/**
 * The container for the value's size steps: as wide as the card's content box, so the steps below
 * read the card width without making the card a size container (which would break the strip's
 * subgrid, see kpiCardContainer).
 */
export const kpiValueBox = cva({
  base: { containerType: "inline-size", minWidth: 0, width: "100%" },
});

/**
 * The one value style for every KPI, whatever the value is (a number through `Money`, a date, a
 * string or any node), so a strip never mixes sizes (R2-2). Long values wrap; they never grow.
 */
export const kpiHeroValue = cva({
  base: {
    textStyle: "numeric.kpi",
    // A money figure never wraps, so a narrow card (a 2-up strip on a phone) steps the whole
    // value down instead. The card is the container and every card in a strip has the same
    // width, so the strip still shows one size. Scale tokens only. Round 4: a 2-up card on a
    // phone (about 8rem inside its padding) keeps "£186,550" readable at 2xl rather than md;
    // only a card under 7rem (a 2x2 strip at 320px holding "minus £1,234,567") steps to md.
    "@container (min-width: 7.01rem) and (max-width: 14rem)": { fontSize: "2xl" },
    "@container (max-width: 7rem)": { fontSize: "md" },
    // On a phone a full-width card (a strip of one, or the third of three) takes the same 2xl
    // step as the two-up cards, so a page shows one KPI figure size (phone audit P22).
    "@media screen and (max-width: 39.99em)": {
      "@container (min-width: 14.01rem)": { fontSize: "2xl" },
    },
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
    /**
     * A value with no digits ("Interest-only", "None") is a word, not a figure: it drops the
     * tabular numerals so its hyphens and letters keep their normal spacing (phone audit P42).
     */
    word: {
      true: { fontVariantNumeric: "normal" },
      false: {},
    },
  },
  defaultVariants: { tone: "default", word: false },
});

/**
 * The slot under the value: the not-set action, the delta badge and the caption. It takes the
 * card's spare height, so the caption (pinned with `mt: auto`) sits at the bottom of the card.
 */
export const kpiFoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "density.gap",
    flexGrow: 1,
    minWidth: 0,
  },
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
