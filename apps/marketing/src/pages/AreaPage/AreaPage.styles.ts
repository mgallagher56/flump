import { css } from "@repo/ui/styled-system/css";

/*
 * The area page template (the approved Pay and Debt and borrowing prototypes, `others.css`). Every
 * size here is the prototype's own.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

/** "What you see": the facts beside the area's set piece from 60rem, stacked below. */
export const split = css({
  display: "grid",
  gap: "1.5rem",
  alignItems: "center",
  "@media (min-width: 60rem)": {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "3rem",
  },
});

export const facts = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "0.85rem",
});

export const factCard = css({ py: "1.1rem", px: "1.25rem", borderRadius: "20px" });

export const factText = css({ margin: 0, color: "text.primary" });

export const factFooter = css({ mt: "4" });

/** The set piece: the area's journey sample, at most 34rem, centred in its column. */
export const setPiece = css({
  minWidth: 0,
  maxWidth: "34rem",
  width: "full",
  justifySelf: "center",
});

/** Retirement plan (Savings and pension only): production's words in a reading column. */
export const retirementBody = css({ display: "grid", gap: "4", maxWidth: "3xl" });

export const retirementText = css({ margin: 0, textStyle: "body.lg", color: "text.secondary" });

/** "More detail when you want it": each deeper tool on a small card with its area's orb. */
export const depthList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "3",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
});

export const depthCard = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  py: "4",
  px: "1.15rem",
  borderRadius: "18px",
  color: "text.primary",
  fontWeight: "medium",
});

export const depthOrb = css({ "--orb-size": "18px" });
