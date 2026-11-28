import { css, cva } from "@repo/ui/styled-system/css";

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const body = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const techBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", pt: "2" },
});

export const techHeading = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const techList = cva({
  base: {
    margin: 0,
    paddingLeft: "5",
    listStyleType: "disc",
    display: "flex",
    flexDirection: "column",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const toolList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const toolItem = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const toolName = cva({
  base: {
    textStyle: "body.sm",
    fontFamily: "mono",
    color: "text.primary",
    overflowWrap: "anywhere",
  },
});

export const toolDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

/** A quiet but obvious disclosure row: hairlines above and below, no trailing gap. */
export const techDisclosure = cva({
  base: {
    py: "3",
    borderBlockWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    "& > div > button": { textStyle: "body.md", fontWeight: "semibold", color: "text.primary" },
  },
});

/** "How to get it": the web app's Settings link lands here (#setup), below the sticky header. */
export const setupSection = cva({ base: { scrollMarginTop: "24" } });

export const inlineLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.emphasis" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/*
 * The approved AI connection prototype (`others2.css`): "What you see" as cards beside one picture,
 * the questions as cards with a small orb, "How to get it" as plain text.
 */

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

/** Layout a's small left bubble would drift up behind the heading here, so this band leaves it out. */
export const noLeftBubble = css({ "& [data-bubble-field] > :nth-child(3)": { display: "none" } });

export const split = css({
  display: "grid",
  gap: "6",
  alignItems: "center",
  "@media (min-width: 60rem)": {
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
    gap: "10",
  },
});

export const splitPicture = css({ justifySelf: "center", width: "min(100%, 22rem)" });

/** Cards in a grid (the questions), or stacked one above the other (the facts). */
export const cards = cva({
  base: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "3" },
  variants: {
    stack: {
      true: { gridTemplateColumns: "minmax(0, 1fr)" },
      false: { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))" },
    },
  },
  defaultVariants: { stack: false },
});

export const card = css({
  display: "flex",
  gap: "3",
  alignItems: "flex-start",
  py: "4",
  px: "5",
  color: "text.primary",
  "& p": { margin: 0 },
});

export const cardOrb = css({ "--orb-size": "20px", mt: "2px" });

export const prose = css({ maxWidth: "46rem", color: "text.primary", "& p": { margin: 0 } });

export const heroBadge = css({ justifySelf: "start" });
