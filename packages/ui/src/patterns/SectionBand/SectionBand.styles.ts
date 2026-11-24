import { cva } from "../../../styled-system/css";

/**
 * A full-width band (`marketing`) or an in-product section heading (`app`). Since Midnight and Mint
 * (owner, 24 Nov 2026) marketing bands alternate `card` (off-white) with `canvas` (pale mint), with
 * one solid mint `hero` band per page (dark ink, text.onHero) and a dark `contrast` closing band
 * (text.onContrast). `teal` (the soft brand-teal tint of owner choice "A", 2026-11-20) stays for
 * callers that still use it. The band sets its own text colour, so the title, subtitle and any
 * text that inherits stay readable on `hero` and `contrast`. No eyebrow, index pill or monospace
 * (E16 PR 12).
 */
export const sectionBandRecipe = cva({
  base: {
    width: "100%",
    px: "4",
    py: { base: "12", md: "16" },
  },
  variants: {
    tone: {
      canvas: { backgroundColor: "surface.canvas", color: "text.primary" },
      card: { backgroundColor: "surface.card", color: "text.primary" },
      teal: {
        backgroundColor: "surface.tint.teal",
        borderBlockWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
        color: "text.primary",
      },
      // Solid mint with dark ink in light; in dark, the card with its hero edge (Midnight).
      hero: {
        backgroundColor: "surface.hero",
        color: "text.onHero",
        borderBlockWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.hero",
      },
      // Charcoal: the closing band above the footer.
      contrast: { backgroundColor: "surface.contrast", color: "text.onContrast" },
    },
    size: {
      default: {},
      compact: { py: { base: "10", md: "12" } },
    },
  },
  defaultVariants: { tone: "canvas", size: "default" },
});

export const sectionBandInner = cva({
  base: { maxWidth: "6xl", mx: "auto", display: "flex", flexDirection: "column", gap: "8" },
  variants: {
    width: {
      wide: {},
      narrow: { maxWidth: "3xl" },
    },
  },
  defaultVariants: { width: "wide" },
});

export const sectionBandHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", maxWidth: "3xl" },
  variants: {
    align: {
      start: { textAlign: "left" },
      center: { textAlign: "center", mx: "auto" },
    },
  },
  defaultVariants: { align: "start" },
});

/** On `hero` and `contrast` the title and subtitle take the band's own text colour. */
const onBandText = {
  canvas: {},
  card: {},
  teal: {},
  hero: { color: "text.onHero" },
  contrast: { color: "text.onContrast" },
} as const;

export const sectionBandTitle = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
  variants: { tone: onBandText },
});

export const sectionBandSubtitle = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
  variants: { tone: onBandText },
});

/** App variant: left-aligned section heading ("Where you stand"), on the border.section rule. */
export const appBandRecipe = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

export const appHeadingGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    pb: "3",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.section",
  },
});

export const appTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const appSubtitleRecipe = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "3xl" },
});
