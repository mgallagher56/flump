import { cva } from "@repo/ui/styled-system/css";

/** One column on a phone, two on a tablet, three on a wide screen. Groups top-aligned. */
export const groupGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "minmax(0, 1fr)",
      md: "repeat(2, minmax(0, 1fr))",
      xl: "repeat(3, minmax(0, 1fr))",
    },
    alignItems: "start",
    columnGap: { base: "8", xl: "10" },
    rowGap: { base: "10", md: "12" },
  },
});

export const groupSection = cva({
  base: { display: "flex", flexDirection: "column", minWidth: 0 },
});

/** The group name sits on the dark section rule, as section titles do (Midnight and Mint). */
export const groupHeading = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    display: "flex",
    alignItems: "center",
    // Content-box, so a plain heading's rule lines up with a linked heading's 44px link.
    boxSizing: "content-box",
    minHeight: "11",
    paddingBottom: "1",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.section",
  },
});

/** A standalone link (style guide B5): teal, 600, no underline until hovered. */
export const groupHeadingLink = cva({
  base: {
    color: "primary",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    minHeight: "11",
    _hover: { color: "primary.emphasis", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const lineList = cva({
  base: { listStyle: "none", margin: 0, padding: 0 },
});

/** Hairlines between lines. `scrollMarginTop` keeps an opened line clear of the sticky header. */
export const item = cva({
  base: {
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    scrollMarginTop: "24",
  },
});

/** The line itself: the whole row is the control, at least 44px tall. */
export const summary = cva({
  base: {
    listStyle: "none",
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    minHeight: "11",
    paddingY: "3",
    paddingX: "2",
    marginX: "-2",
    borderRadius: "md",
    cursor: "pointer",
    "&::-webkit-details-marker": { display: "none" },
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "0" },
  },
});

export const summaryText = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", flex: "1", minWidth: 0 },
});

export const lineName = cva({
  base: { textStyle: "body.md", fontWeight: "semibold", color: "text.primary" },
});

export const lineText = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});

/** Points down when closed, up when open. Turning only, and only when motion is welcome. */
export const chevron = cva({
  base: {
    flexShrink: 0,
    marginTop: "1",
    color: "text.secondary",
    "details[open] > summary > &": { transform: "rotate(180deg)" },
    _motionSafe: { transition: "transform token(durations.fast) token(easings.standard)" },
  },
});

export const panel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2",
    paddingBottom: "4",
    paddingRight: "8",
  },
});

export const detailText = cva({
  base: { textStyle: "body.sm", color: "text.primary", margin: 0 },
});

/** A standalone link (style guide B5): teal, 600, no underline until hovered. */
export const moreLink = cva({
  base: {
    textStyle: "body.sm",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "none",
    textUnderlineOffset: "3px",
    display: "inline-flex",
    alignItems: "center",
    minHeight: "11",
    _hover: { color: "primary.emphasis", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
