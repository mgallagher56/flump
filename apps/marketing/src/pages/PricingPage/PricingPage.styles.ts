import { css } from "@repo/ui/styled-system/css";

/*
 * The approved pricing prototype (`others.css`, `o1-plan` and `o1-paid`): the plan as a glass card,
 * the paid plan as one quiet line under it.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

/** No bubbles behind the price under 64rem, where the card fills the width. */
export const planBand = css({
  "@media (max-width: 63.99rem)": { "& [data-bubble-field]": { display: "none" } },
});

export const planCard = css({
  display: "grid",
  gap: "5",
  p: "clamp(24px, 3vw, 48px)",
  // Longhands: they come after the card's own corner in the stylesheet, so they win.
  borderTopLeftRadius: "28px",
  borderTopRightRadius: "28px",
  borderBottomLeftRadius: "28px",
  borderBottomRightRadius: "28px",
});

export const planName = css({
  margin: 0,
  fontWeight: "bold",
  fontSize: "2xl",
  lineHeight: "1.25",
  color: "text.primary",
});

export const featureList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "3",
});

export const featureItem = css({
  display: "flex",
  gap: "2.5",
  alignItems: "flex-start",
  color: "text.primary",
});

export const featureIcon = css({
  flex: "none",
  display: "inline-grid",
  placeItems: "center",
  mt: "0.5",
  color: "primary",
});

/** The possible paid plan: one quiet line, no card chrome to fill (D10 b). */
export const paidLine = css({
  mt: "5",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  rowGap: "1.5",
  columnGap: "3",
  px: "1",
});

export const paidName = css({
  margin: 0,
  fontWeight: "bold",
  fontSize: "md",
  color: "text.primary",
});

export const paidPrice = css({ color: "text.secondary", fontVariantNumeric: "tabular-nums" });

export const paidNote = css({
  flexBasis: "100%",
  margin: 0,
  color: "text.secondary",
  fontSize: "sm",
});

/** The band's own column gap (`SectionBand`'s 2rem), kept around the moment's wrapper. */
export const stack = css({ display: "flex", flexDirection: "column", gap: "8" });
