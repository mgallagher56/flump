import { cva } from "../../../styled-system/css";

/**
 * Below md: a grid with the h1 and the actions on the first row and the description full width
 * under both, so an action never splits the h1 from its description (E16 round 4). The h1 never
 * shrinks below its longest word; several actions wrap inside their own cell. From md: text
 * beside the actions, wrapping when they do not fit.
 */
export const pageHeaderContainer = cva({
  base: {
    display: { base: "grid", md: "flex" },
    gridTemplateColumns: { base: "minmax(min-content, 1fr) auto", md: "none" },
    justifyContent: "space-between",
    alignItems: { base: "center", md: "flex-start" },
    flexWrap: "wrap",
    columnGap: "4",
    rowGap: { base: "1", md: "4" },
    width: "100%",
    mb: { base: "5", md: "6" },
  },
  variants: {
    // The page icon takes the first column below md, so it sits beside the h1, never above it.
    withIcon: { true: { gridTemplateColumns: { base: "auto minmax(min-content, 1fr) auto" } } },
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
    gridColumn: { base: "1", md: "auto" },
    gridRow: { base: "1", md: "auto" },
    // Wraps between words beside the actions; never narrower than its longest word.
    overflowWrap: "break-word",
  },
  variants: { withIcon: { true: { gridColumn: { base: "2", md: "auto" } } } },
});

export const pageHeaderDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: "0",
    mt: { base: "0", md: "1" },
    maxWidth: "720px",
    gridColumn: { base: "1 / -1", md: "auto" },
    gridRow: { base: "2", md: "auto" },
  },
});

export const pageHeaderAside = cva({
  base: {
    gridColumn: { base: "2", md: "auto" },
    gridRow: { base: "1", md: "auto" },
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "3",
  },
  variants: { withIcon: { true: { gridColumn: { base: "3", md: "auto" } } } },
});

/**
 * The page icon: the page's own illustration, the same size and place on every page, beside the
 * h1 at every width. 48px wide below md (36px tall, no taller than the h1 row, so the first
 * figure stays where it was) and 64px from md.
 */
export const pageHeaderIcon = cva({
  base: {
    flex: "0 0 auto",
    width: { base: "12", md: "16" },
    gridColumn: { base: "1", md: "auto" },
    gridRow: { base: "1", md: "auto" },
    alignSelf: { base: "center", md: "flex-start" },
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
