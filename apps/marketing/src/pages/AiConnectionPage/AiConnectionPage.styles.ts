import { cva } from "@repo/ui/styled-system/css";

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const body = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const questionList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: "4",
  },
});

export const questionCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    textStyle: "body.md",
    color: "text.primary",
  },
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
    // The web app links to #setup: land below the sticky header, not under it.
    scrollMarginTop: "24",
    "& > div > button": { textStyle: "body.md", fontWeight: "semibold", color: "text.primary" },
  },
});
