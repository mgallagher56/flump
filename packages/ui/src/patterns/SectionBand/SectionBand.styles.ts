import { cva } from "../../../styled-system/css";

/**
 * A full-width band (`marketing`) or an in-product section heading (`app`). Marketing bands use
 * four tones: canvas and subtle are the quiet ones; sage and apricot are the two tinted bands the
 * owner allowed in light mode (D16 b), at most one of each per page. Every tone is a semantic
 * surface, so dark mode (Direction C) needs no extra rules. No eyebrow, index pill or monospace
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
      canvas: { backgroundColor: "surface.canvas" },
      subtle: {
        backgroundColor: "surface.subtle",
        borderBlockWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
      },
      sage: {
        backgroundColor: "surface.tint.sage",
        borderBlockWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
      },
      apricot: {
        backgroundColor: "surface.tint.apricot",
        borderBlockWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
      },
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

export const sectionBandTitle = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const sectionBandSubtitle = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

/** App variant: left-aligned section heading as on the Direction C frame ("Where you stand"). */
export const appBandRecipe = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

export const appHeadingGroup = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const appTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const appSubtitleRecipe = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "3xl" },
});
