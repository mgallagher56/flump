import { css } from "@repo/ui/styled-system/css";

export const detailList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "3",
  "@media (min-width: 90rem)": { gap: "4" },
});

/**
 * One deeper tool, as prototype 11's sheet: canvas on the card band, a rounder corner, the link
 * beside the words from 37.5rem and under them again in the pair (75rem). From 90rem, in the pair,
 * the sheet and its words grow a little so the two lists read at the size of the bands around them.
 */
export const detailItem = css({
  height: "full",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "center",
  rowGap: "1.5",
  columnGap: "4.5",
  py: "4.5",
  px: "5",
  backgroundColor: "surface.canvas",
  _dark: { backgroundColor: "surface.overlay" },
  _systemDark: { backgroundColor: "surface.overlay" },
  "@media (min-width: 37.5rem)": { gridTemplateColumns: "minmax(0, 1fr) auto" },
  "@media (min-width: 75rem)": { gridTemplateColumns: "minmax(0, 1fr)" },
  "@media (min-width: 90rem)": {
    py: "clamp(20px, 1.4vw, 28px)",
    px: "clamp(22px, 1.6vw, 32px)",
  },
});

export const detailText = css({
  textStyle: "body.md",
  fontSize: { base: "md", "2xl": "lg" },
  lineHeight: "1.45",
  color: "text.primary",
  "@media (min-width: 90rem)": { fontSize: "lg" },
});

export const detailLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  "@media (min-width: 90rem)": { fontSize: "md" },
  _hover: { color: "primary.emphasis" },
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});
