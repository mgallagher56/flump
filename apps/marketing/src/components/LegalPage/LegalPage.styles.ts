import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
  },
});

export const mainContent = cva({
  base: { flex: "1", px: "4", py: { base: "12", md: "16" }, _focus: { outline: "none" } },
});

/** A reading column: long text stays under about 75 characters a line. */
export const container = cva({
  base: { maxWidth: "3xl", mx: "auto", display: "flex", flexDirection: "column", gap: "10" },
});

export const headerBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const heading = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

export const versionLine = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The quiet notes under the title: who checked the page, and which details are stand-ins. */
export const note = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const section = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    scrollMarginTop: "24",
    "& p": { textStyle: "body.md", color: "text.secondary", margin: 0 },
    "& ul": {
      textStyle: "body.md",
      color: "text.secondary",
      margin: 0,
      pl: "5",
      listStyleType: "disc",
      // The version history lines carry dates.
      fontVariantNumeric: "tabular-nums",
      display: "flex",
      flexDirection: "column",
      gap: "2",
    },
    "& h3": { textStyle: "heading.sm", color: "text.primary", margin: 0, mt: "3" },
    "& strong": { color: "text.primary", fontWeight: "semibold" },
    "& code": { overflowWrap: "anywhere", color: "text.primary" },
  },
});

export const sectionHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

// Links are teal in light and mint in dark (Midnight and Mint), underlined so colour is not the
// only sign of a link inside running text.
export const link = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    overflowWrap: "anywhere",
    _hover: { color: "primary.emphasis" },
  },
});

export const otherPages = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    pt: "6",
  },
});

export const otherPagesList = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "6",
    rowGap: "2",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    textStyle: "body.md",
  },
});

/** One stored item on the cookies page: a name, then what it is for and how long it lasts. */
export const itemList = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", margin: 0, padding: 0 },
});

export const item = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "border.subtle",
    pl: "4",
    "& dt": { textStyle: "body.md", color: "text.primary", fontWeight: "semibold" },
    "& dd": { textStyle: "body.md", color: "text.secondary", margin: 0 },
  },
});
