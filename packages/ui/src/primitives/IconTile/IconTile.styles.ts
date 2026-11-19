import { cva } from "../../../styled-system/css";

/**
 * A 40px rounded tile on the domain's tint behind a Lucide icon. The icon uses
 * `text.primary`, which clears 4.5:1 on every tint and on `surface.subtle` in both themes.
 * The neutral tile sits on `surface.subtle` with a `border` edge: `surface.sunken` was darker than
 * the dark card and read as a hole, so the tile all but vanished in dark mode.
 */
export const iconTile = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    color: "text.primary",
  },
  variants: {
    tone: {
      teal: { backgroundColor: "surface.tint.teal" },
      sage: { backgroundColor: "surface.tint.sage" },
      apricot: { backgroundColor: "surface.tint.apricot" },
      sky: { backgroundColor: "surface.tint.sky" },
      rose: { backgroundColor: "surface.tint.rose" },
      violet: { backgroundColor: "surface.tint.violet" },
      /** E17 Damson: wayfinding outside the areas (STYLE-GUIDE C7). Never beside a status. */
      accent: { backgroundColor: "accent.subtle", color: "accent" },
      neutral: {
        backgroundColor: "surface.subtle",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "border",
      },
    },
    /** The glyph in the tone's colour instead of text.primary (accent is coloured already). */
    colouredIcon: { true: {}, false: {} },
  },
  compoundVariants: [
    // A coloured glyph: the tone's chart series, at least 3:1 on its tint in both themes
    // (tokens.a11y.test.ts). The tile is decorative beside a visible name.
    // Written out, not mapped: Panda only extracts literal recipe objects.
    { tone: "teal", colouredIcon: true, css: { color: "chart.series1" } },
    { tone: "sage", colouredIcon: true, css: { color: "chart.series2" } },
    { tone: "apricot", colouredIcon: true, css: { color: "chart.series3" } },
    { tone: "violet", colouredIcon: true, css: { color: "chart.series4" } },
    { tone: "sky", colouredIcon: true, css: { color: "chart.series6" } },
    { tone: "rose", colouredIcon: true, css: { color: "chart.series5" } },
  ],
  defaultVariants: { tone: "neutral", colouredIcon: false },
});
