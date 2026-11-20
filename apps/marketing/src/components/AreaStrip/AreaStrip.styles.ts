import { cva } from "@repo/ui/styled-system/css";

export const stripList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" },
    gap: "3",
  },
});

/**
 * One area. The current one takes the `primary` edge and a heavier label; the mark is also given
 * in words ("You are here") and by `aria-current`, so it never rests on colour alone.
 */
export const stripLink = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "1",
    height: "100%",
    minHeight: "touch",
    px: "4",
    py: "3",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "label.md",
    textDecoration: "none",
    transitionProperty: "border-color, background-color",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
    // Hover changes the edge only: the tile sits on a teal band or the canvas, and a fill would
    // either vanish into the band or bring back the warm grey the owner disliked (2026-11-20).
    _hover: { borderColor: "primary.border" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
  variants: {
    current: {
      true: {
        // An inset ring, not a wider border, so the current tile keeps the same layout as the rest.
        borderColor: "primary",
        outline: "1px solid",
        outlineColor: "primary",
        outlineOffset: "-2px",
        // The card surface, as the other tiles: `primary.subtle` all but matched the teal band.
        fontWeight: "bold",
      },
    },
  },
});

export const stripHere = cva({
  base: { textStyle: "label.sm", fontWeight: "normal", color: "text.secondary" },
});
