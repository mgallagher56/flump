import { css } from "@repo/ui/styled-system/css";

/*
 * The approved security prototype (`others2.css`): the facts as stacked glass cards beside one
 * picture, the reporting route in a card of its own.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

export const split = css({
  display: "grid",
  gap: "6",
  alignItems: "center",
  "@media (min-width: 60rem)": {
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
    gap: "10",
  },
});

/** Beside the facts from 60rem; stacked below them on narrower screens, at the picture's smallest. */
export const splitPicture = css({
  justifySelf: "center",
  width: "min(100%, 280px)",
  "@media (min-width: 60rem)": { width: "min(100%, 22rem)" },
});

export const factList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "3",
  gridTemplateColumns: "minmax(0, 1fr)",
});

export const factCard = css({
  display: "flex",
  gap: "3",
  alignItems: "flex-start",
  py: "4",
  px: "5",
  // Longhands: they come after the card's own corner in the stylesheet, so they win.
  borderTopLeftRadius: "20px",
  borderTopRightRadius: "20px",
  borderBottomLeftRadius: "20px",
  borderBottomRightRadius: "20px",
  color: "text.primary",
  "& p": { margin: 0 },
});

export const factOrb = css({ "--orb-size": "20px", flex: "none", mt: "2px" });

export const factLink = css({
  color: "primary",
  fontWeight: "semibold",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/** The reporting route in a card: the card is the boundary, so the section has no rule above it. */
export const reportingCard = css({
  maxWidth: "46rem",
  p: "clamp(24px, 3vw, 48px)",
  // Longhands: they come after the card's own corner in the stylesheet, so they win.
  borderTopLeftRadius: "28px",
  borderTopRightRadius: "28px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
  color: "text.primary",
  // The prototype's prose links (`o2-prose a`): semibold.
  "& a": { fontWeight: "semibold" },
});
