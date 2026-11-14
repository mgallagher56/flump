import { cva } from "../../../styled-system/css";

/**
 * Below md: the h1 and the actions share the first line when they fit, and the description runs
 * full width under them, so a single action never takes a row of its own (E16 round 4). Actions
 * that do not fit beside the h1 wrap onto their own line; the h1 never shrinks. From md: text
 * beside the actions, wrapping when they do not fit.
 */
export const pageHeaderContainer = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: { base: "center", md: "flex-start" },
    flexWrap: "wrap",
    columnGap: "4",
    rowGap: { base: "1", md: "4" },
    width: "100%",
    mb: { base: "5", md: "6" },
  },
});

export const pageHeaderText = cva({
  // Below md its children join the header's flex line (h1 beside the actions, description below).
  base: { display: { base: "contents", md: "block" }, flex: "1 1 280px", minWidth: 0 },
});

export const pageHeaderTitle = cva({
  base: {
    textStyle: "heading.xl",
    color: "text.primary",
    margin: "0",
    order: { base: 1, md: 0 },
    // Grows beside the actions; a title longer than the line shrinks and wraps instead of running
    // off the screen. Actions that do not fit beside it wrap onto their own line.
    flex: { base: "1 1 auto", md: "none" },
    minWidth: 0,
    overflowWrap: "anywhere",
  },
});

export const pageHeaderDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: "0",
    mt: { base: "0", md: "1" },
    maxWidth: "720px",
    order: { base: 3, md: 0 },
    flexBasis: { base: "100%", md: "auto" },
  },
});

export const pageHeaderAside = cva({
  base: {
    order: { base: 2, md: 0 },
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "3",
  },
});

/** Quiet outlined pill, for example "Sample data". */
export const pageHeaderBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    textStyle: "label.sm",
    color: "text.secondary",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "full",
    px: "3",
    py: "0.5",
    whiteSpace: "nowrap",
  },
});
