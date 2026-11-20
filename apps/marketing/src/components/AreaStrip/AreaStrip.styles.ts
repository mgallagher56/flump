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
    _hover: { borderColor: "primary.border", backgroundColor: "surface.subtle" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
  variants: {
    current: {
      true: {
        borderColor: "primary",
        borderWidth: "2px",
        backgroundColor: "primary.subtle",
        fontWeight: "bold",
      },
    },
  },
});

export const stripHere = cva({
  base: { textStyle: "label.sm", fontWeight: "normal", color: "text.secondary" },
});
