import { cva } from "@repo/ui/styled-system/css";

/**
 * A full-width marketing band (E16 PR 12). Sage and apricot are the two tinted bands the owner
 * allowed on marketing in light mode (D16 b); canvas and subtle are the quiet ones. Every tone uses
 * a semantic surface, so dark mode follows Direction C with no extra rules.
 */
export const marketingSection = cva({
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

export const marketingSectionInner = cva({
  base: { maxWidth: "6xl", mx: "auto", display: "flex", flexDirection: "column", gap: "8" },
  variants: {
    width: {
      wide: {},
      narrow: { maxWidth: "3xl" },
    },
  },
  defaultVariants: { width: "wide" },
});

export const marketingSectionHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", maxWidth: "3xl" },
  variants: {
    align: {
      start: { textAlign: "left" },
      center: { textAlign: "center", mx: "auto" },
    },
  },
  defaultVariants: { align: "start" },
});

export const marketingSectionTitle = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const marketingSectionSubtitle = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});
