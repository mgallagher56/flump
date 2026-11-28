import { css } from "@repo/ui/styled-system/css";

/*
 * The grouped index (the approved features prototype, `others.css`): balanced columns that fill
 * top to bottom, so a short group never leaves a hole beside a long one. Reading and Tab order are
 * the DOM's, the app's area order, down each column. Each group is a glass card headed by a small
 * orb in its area's journey colour; its lines open smoothly.
 */
export const groupColumns = css({ columns: "22rem 3", columnGap: "5" });

export const groupCard = css({
  breakInside: "avoid",
  mb: "5",
  p: "5",
});

export const groupHead = css({ display: "flex", alignItems: "center", gap: "3", mb: "2" });

/** The group's orb: 34px. */
export const groupOrb = css({ "--orb-size": "34px" });

/** heading.lg, clearly above the 16px semibold line names (the prototype's type scale). */
export const groupTitle = css({ textStyle: "heading.lg", margin: 0, color: "text.primary" });

export const groupLink = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  color: "inherit",
  textDecoration: "none",
  _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const lineList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  "& > li + li": { borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "border" },
});

export const summary = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  py: "3",
  px: "1",
  cursor: "pointer",
  listStyle: "none",
  borderRadius: "10px",
  "&::-webkit-details-marker": { display: "none" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const summaryText = css({ flex: "1", display: "grid", gap: "0.1rem", minWidth: 0 });

export const lineName = css({
  textStyle: "body.md",
  fontWeight: "semibold",
  color: "text.primary",
});

export const lineText = css({ textStyle: "body.sm", color: "text.secondary" });

/** Turns as the line opens, only when motion is welcome (it stays put while a line closes). */
export const chevron = css({
  flex: "none",
  color: "text.secondary",
  _motionSafe: {
    transitionProperty: "rotate",
    transitionDuration: "marketing.disclosure",
    transitionTimingFunction: "marketing.calmInOut",
  },
  "details[open]:not([data-state=closed]) &": { rotate: "180deg" },
});

export const panel = css({
  overflow: "hidden",
  display: "grid",
  gap: "2",
  px: "1",
  pb: "0.9rem",
});

export const detailText = css({ margin: 0, color: "text.secondary" });

export const moreLink = css({
  color: "primary",
  fontWeight: "semibold",
  textUnderlineOffset: "3px",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
