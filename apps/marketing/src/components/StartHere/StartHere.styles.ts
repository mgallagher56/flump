import { css } from "@repo/ui/styled-system/css";

/*
 * "Start here" as four glass cards (the approved features prototype, `others.css`): the goal in
 * heading.md over its links at 16px semibold, the links side by side in wrapped rows, each a 44px
 * target, so the card stays short.
 */

/** Layout a's small left bubble would drift up behind the heading here, so this band leaves it out. */
export const band = css({ "& [data-bubble-field] > :nth-child(3)": { display: "none" } });

export const goalList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "4",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12.5rem), 1fr))",
});

export const goalItem = css({ height: "full" });

export const goalCard = css({
  height: "full",
  display: "grid",
  alignContent: "start",
  gap: "1",
  pt: "4",
  px: "5",
  pb: "3",
  borderRadius: "22px",
});

export const goal = css({ textStyle: "heading.md", margin: 0, color: "text.primary" });

export const goalLinks = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexWrap: "wrap",
  columnGap: "4",
});

export const goalLink = css({
  textStyle: "body.md",
  fontWeight: "semibold",
  display: "flex",
  alignItems: "center",
  minHeight: "44px",
  color: "primary",
  textDecoration: "none",
  _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
