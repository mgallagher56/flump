import { cva } from "@repo/ui/styled-system/css";

const DARK = {
  backgroundColor: "surface.overlay",
  backgroundImage:
    "linear-gradient(155deg, color-mix(in oklab, token(colors.text.onContrast) 8%, transparent), transparent 45%)",
} as const;

/**
 * Prototype 11's soft card (`p11-soft-card` in its `page.css`), which the approved features and
 * area prototypes use for every card: the plain border and the card shadow; in Mint the canvas
 * under a faint diagonal sheen of the light ink on a card band, and the card colour on a canvas
 * band; in Midnight the overlay surface under the same sheen, a step lighter than the band.
 */
export const softCard = cva({
  base: {
    borderColor: "border",
    boxShadow: "card",
    _dark: DARK,
    _systemDark: DARK,
  },
  variants: {
    band: {
      card: {
        backgroundColor: "surface.canvas",
        backgroundImage:
          "linear-gradient(155deg, color-mix(in oklab, token(colors.text.onContrast) 6%, transparent), transparent 45%)",
      },
      canvas: { backgroundColor: "surface.card", backgroundImage: "none" },
    },
  },
  defaultVariants: { band: "card" },
});
