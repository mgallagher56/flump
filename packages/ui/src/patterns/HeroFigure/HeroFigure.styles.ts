import { sva } from "../../../styled-system/css";

/**
 * The card is too narrow for the hero size. Container queries, not media queries, because rem in a
 * container query follows the root font size (browser text zoom and a root `font-size: 200%`),
 * where an em media query only follows the browser's initial size. A rem width is then a fixed
 * multiple of the figure's size: "£1,234,567" is about 5.5em, so at 3rem it needs about 16.5rem,
 * at numeric.kpi (2rem) about 11rem and at numeric.lg (1.25rem) about 7rem. A 320px phone at
 * default text leaves about 15.5rem and keeps the hero size; a 375px phone at 200% text leaves
 * about 7.5rem and steps to numeric.lg.
 */
const NARROW_CARD = "@container hero-figure (min-width: 10.01rem) and (max-width: 14rem)";
const NARROWEST_CARD = "@container hero-figure (max-width: 10rem)";
/**
 * Wide enough for the figure at hero size (about 16.5rem for "£1,234,567") plus an aside of about
 * 8rem and a gap. Below it the aside goes under the figure: a 375px phone leaves about 19rem.
 */
const WIDE_CARD = "@container hero-figure (min-width: 30rem)";

/**
 * E16 P2: the page's one headline figure. `hero` is the single headline block per page
 * (`surface.hero`): solid mint with dark ink (`text.onHero`) in light, a card with an edge
 * (`border.hero`) and a mint figure (`text.heroFigure`) in dark, with no decoration. `plain` is the
 * fallback when the value is unknown: an ordinary card with a "Not set" prompt, never the hero.
 */
export const heroFigure = sva({
  slots: [
    "root",
    "body",
    "content",
    "aside",
    "labelRow",
    "label",
    "estimate",
    "value",
    "delta",
    "subline",
    "unset",
    "prompt",
    "action",
  ],
  base: {
    root: {
      position: "relative",
      overflow: "hidden",
      isolation: "isolate",
      borderRadius: "card",
      borderWidth: "1px",
      borderStyle: "solid",
      p: { base: "5", md: "6" },
      minWidth: "0",
      // From md one steady width instead of a full-width band that is mostly empty (R2-5
      // re-score), the same on every page and breakpoint whatever the figure; the end padding
      // leaves the decorative disc room beside the figure.
      width: "100%",
      maxWidth: "100%",
      paddingInlineEnd: { md: "24" },
      // The figure steps down its size by the card's own width (NARROW_CARD).
      containerType: "inline-size",
      containerName: "hero-figure",
    },
    // Only drawn with an aside: the figure and the aside side by side on a wide card, the aside
    // under the figure on a narrow one, so neither is ever squeezed.
    body: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      minWidth: "0",
      [WIDE_CARD]: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
      },
    },
    content: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      minWidth: "0",
    },
    aside: { flexShrink: "0", minWidth: "0" },
    labelRow: { display: "flex", alignItems: "center", gap: "1", minWidth: "0" },
    label: {
      textStyle: "label.md",
      margin: "0",
      overflowWrap: "anywhere",
    },
    // The estimate label: a quiet outlined pill in the hero's own ink, so it reads on the fill in
    // both themes and under forced colours without a status colour.
    estimate: {
      alignSelf: "flex-start",
      textStyle: "label.sm",
      margin: "0",
      px: "2",
      py: "0.5",
      borderRadius: "full",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "currentColor",
      whiteSpace: "nowrap",
    },
    value: {
      textStyle: "numeric.hero",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
      // A figure is read whole: it never breaks mid-number ("£592,70 / 0", phone audit P43). In a
      // card too narrow for the hero size (a phone at large text) it steps down, so
      // "£1,234,567" still fits the card on one line (phone sweep 4).
      whiteSpace: "nowrap",
      [NARROW_CARD]: { textStyle: "numeric.kpi" },
      [NARROWEST_CARD]: { textStyle: "numeric.lg" },
    },
    delta: {
      display: "inline-flex",
      alignItems: "center",
      gap: "1",
      textStyle: "body.sm",
      fontWeight: "medium",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
    },
    subline: {
      textStyle: "body.sm",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
    },
    unset: {
      textStyle: "numeric.unset",
      color: "text.muted",
      margin: "0",
    },
    prompt: {
      textStyle: "body.sm",
      color: "text.secondary",
      margin: "0",
    },
    action: {
      display: "flex",
      flexWrap: "wrap",
      gap: "2",
      pt: "2",
    },
  },
  variants: {
    // The end padding kept room for a disc that is gone; with an aside the block uses its width.
    withAside: {
      true: { root: { paddingInlineEnd: { md: "6" } } },
      false: {},
    },
    tone: {
      hero: {
        root: {
          backgroundColor: "surface.hero",
          borderColor: "border.hero",
          color: "text.onHero",
          // The hero ink is the strongest outline on both heroes (8:1 and more). The app's global
          // unlayered focus rule reads --colors-border-focus-ring, so the hero resets that too.
          "--colors-border-focus-ring": "token(colors.text.onHero)",
          "& :focus-visible": { outlineColor: "text.onHero" },
          // A link never belongs on the hero, but if one lands there it keeps the hero ink: the
          // teal is 3.5:1 on the light mint.
          "& a": { color: "text.onHero" },
          // Forced colours (Windows contrast themes) replace the hero fill with the system canvas,
          // and hero text on it was the gate's contrast finding. Use the system pair and keep a
          // real border so the block still reads as one block (UX A12).
          _highContrast: {
            backgroundColor: "Canvas",
            borderColor: "CanvasText",
            color: "CanvasText",
            "& *:not(a)": { color: "CanvasText" },
            "& :focus-visible": { outlineColor: "Highlight" },
          },
        },
        label: { color: "text.onHero" },
        estimate: { color: "text.onHero" },
        // The InfoTip trigger defaults to text.muted, which fails on the light hero. The extra type
        // and attribute outrank the trigger's doubled class (open state keeps its own colours).
        labelRow: {
          "& button[aria-haspopup]:not([data-state='open'])": { color: "text.onHero" },
        },
        value: { color: "text.heroFigure" },
        delta: { color: "text.onHero" },
        subline: { color: "text.onHero" },
      },
      plain: {
        root: {
          backgroundColor: "surface.card",
          borderColor: "border",
          boxShadow: "card",
          color: "text.primary",
        },
        label: { color: "text.secondary" },
      },
    },
  },
  defaultVariants: { tone: "hero", withAside: false },
});
