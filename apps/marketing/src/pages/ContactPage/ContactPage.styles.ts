import { css } from "@repo/ui/styled-system/css";

/* The approved contact prototype (`others2.css`, `o2-contact`): the email card, then one line. */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

export const card = css({
  display: "grid",
  gap: "3",
  p: "clamp(24px, 3vw, 48px)",
  // Longhands: they come after the card's own corner in the stylesheet, so they win.
  borderTopLeftRadius: "28px",
  borderTopRightRadius: "28px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
});

/** The prototype names the card with the plan card's heading (`o1-plan__name`). */
export const cardHeading = css({
  margin: 0,
  fontWeight: "bold",
  fontSize: "2xl",
  lineHeight: "1.25",
  color: "text.primary",
});

export const addressLine = css({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  rowGap: "2",
  columnGap: "3",
});

export const placeholderNote = css({ color: "text.secondary" });

export const prose = css({ margin: 0, maxWidth: "46rem", color: "text.primary" });

export const link = css({
  color: "primary",
  fontWeight: "semibold",
  overflowWrap: "anywhere",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/** The band's own column gap (`SectionBand`'s 2rem), kept around the moment's wrapper. */
export const stack = css({ display: "flex", flexDirection: "column", gap: "8" });
