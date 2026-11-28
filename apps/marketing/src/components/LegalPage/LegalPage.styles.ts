import { css, cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
  },
});

export const mainContent = cva({
  base: {
    flex: "1",
    px: "4",
    py: { base: "12", md: "16" },
    // The header band's orb layer is as wide as the screen; nothing may scroll sideways.
    overflowX: "clip",
    _focus: { outline: "none" },
  },
});

/** A reading column: long text stays under about 75 characters a line. */
export const container = cva({
  base: { maxWidth: "3xl", mx: "auto", display: "flex", flexDirection: "column", gap: "10" },
});

export const headerBlock = cva({
  base: {
    position: "relative",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

/*
 * The header band (the approved prototypes' `legalLayout`): from the top of main to 24px below the
 * title block, as wide as the screen. Wide screens put three orbs in the margins beside the 48rem
 * reading column, sized by the margin; narrower screens put two small ones in the band's top
 * padding, above the title. Each orb is centred on its point.
 *
 * The prototype goes wide from 900px, where the big orbs run into the reading column up to about
 * 970px (an orb behind the title breaks MP8). The owner ruled on 28 Nov 2026 that the wide layout
 * starts at 1000px ("Yes, from 1000px"): `WIDE` below is the one place it is set.
 */
export const headerOrbs = css({
  position: "absolute",
  zIndex: "-1",
  pointerEvents: "none",
  top: { base: "calc(-1 * token(spacing.12))", md: "calc(-1 * token(spacing.16))" },
  bottom: "-24px",
  left: "50%",
  width: "100vw",
  translate: "-50% 0",
  "--legal-margin": "calc((100vw - 768px) / 2)",
  "--legal-left": "max(70px, calc(var(--legal-margin) / 2))",
  "& > [data-legal-orb]": {
    position: "absolute",
    display: "block",
    lineHeight: "0",
    translate: "-50% -50%",
  },
  "& > [data-legal-orb='0']": { left: "calc(100% - 64px)", top: "26px", "--orb-size": "34px" },
  "& > [data-legal-orb='1']": { left: "calc(100% - 30px)", top: "32px", "--orb-size": "20px" },
  "& > [data-legal-orb='2']": { display: "none" },
  // WIDE: the one place the wide layout's first width is set.
  "@media (min-width: 1000px)": {
    "& > [data-legal-orb='0']": {
      left: "var(--legal-left)",
      top: "42%",
      "--orb-size": "min(calc(var(--legal-margin) * 0.62), 150px)",
    },
    "& > [data-legal-orb='1']": {
      left: "calc(100% - var(--legal-left))",
      top: "30%",
      "--orb-size": "min(calc(var(--legal-margin) * 0.42), 100px)",
    },
    "& > [data-legal-orb='2']": {
      display: "block",
      left: "calc(100% - var(--legal-left) * 0.7)",
      top: "78%",
      "--orb-size": "min(calc(var(--legal-margin) * 0.24), 56px)",
    },
  },
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
