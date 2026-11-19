import { cva } from "../../../styled-system/css";

/**
 * The header is narrower than 16rem: a phone at large text (375px at 200% text leaves a header of
 * about 10.7rem). At default text the narrowest header is 17rem (a 320px phone less 24px gutters),
 * so it never matches. A container query on the header in rem, so it follows the root font size
 * (browser text zoom), which an em media query never sees (as in TopBar and MobileBottomBar).
 */
const LARGE_TEXT_PHONE = "@container page-header (max-width: 15.99rem)";

/**
 * A viewport under 480px tall: a phone in landscape (812x375). The 67px app header and a full page
 * header there push the headline figure below the first view, so the header goes compact: no page
 * icon or description, a smaller h1 and less space below (P78). Also used by PageBody.
 */
export const SHORT_VIEWPORT =
  "@media screen and (max-height: 479.98px) and (orientation: landscape) and (pointer: coarse)";

/**
 * Below md: a wrapping flex row, read in order h1, description (with the page icon), then the
 * actions on a row of their own, so wrapped actions never sit between the h1 and its description
 * (phone sweep 4). With no description the actions sit beside the h1 when both fit, and drop under
 * it otherwise, so the h1 is never squeezed and nothing overlaps it (phone audit RC-1).
 * From md: text beside the actions, wrapping when they do not fit.
 */
export const pageHeaderContainer = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: { base: "center", md: "flex-start" },
    columnGap: "4",
    rowGap: { base: "2", md: "4" },
    width: "100%",
    minWidth: 0,
    mb: { base: "5", md: "6" },
    containerType: "inline-size",
    containerName: "page-header",
    // A hair that follows the root font size (0 at default text, 1px at 200%): Chrome re-checks a
    // container query only when the container's size changes, so a text-size change after load
    // then re-checks LARGE_TEXT_PHONE.
    paddingInline: "calc(0.0625rem - 1px)",
    [SHORT_VIEWPORT]: { alignItems: "center", rowGap: "2", mb: "3" },
  },
  variants: {
    /**
     * Below md the page icon starts the description's row; this zero-height, full-width item
     * ends the h1 row first, so the icon never joins the h1 and the actions.
     */
    iconRow: {
      true: {
        _after: {
          content: '""',
          display: { base: "block", md: "none" },
          order: 3,
          flexBasis: "100%",
          height: "0",
        },
      },
    },
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
    order: 1,
    // On its own one-line width: the actions drop under it when both do not fit.
    flex: { base: "1 1 auto", md: "initial" },
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "break-word",
    [SHORT_VIEWPORT]: { textStyle: "heading.lg" },
  },
});

export const pageHeaderDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: "0",
    mt: { base: "0", md: "1" },
    maxWidth: "720px",
    order: 5,
    minWidth: 0,
    // Out of sight but still read by screen readers (the visually hidden pattern), unlike
    // `display: none`, which would take the page's one-line description from them too.
    [SHORT_VIEWPORT]: {
      position: "absolute",
      width: "1px",
      height: "1px",
      margin: "-1px",
      padding: "0",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      borderWidth: "0",
    },
  },
  variants: {
    // Below md the page icon shares the description's row; without it the description is a row.
    withIcon: {
      true: { flex: { base: "1 1 0", md: "initial" } },
      false: { flexBasis: { base: "100%", md: "auto" } },
    },
  },
  defaultVariants: { withIcon: false },
});

export const pageHeaderAside = cva({
  base: {
    flex: "0 1 auto",
    maxWidth: "100%",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: { base: "flex-start", md: "flex-end" },
    gap: "3",
  },
  variants: {
    /** With a description, below md the actions follow it on their own row (order 6). */
    afterText: {
      true: { order: { base: 6, md: 2 }, flexBasis: { base: "100%", md: "auto" } },
      false: { order: 2 },
    },
  },
  defaultVariants: { afterText: false },
});

/**
 * The page icon: the page's own illustration, the same size on every page. From md it sits
 * before the h1 (64px wide). Below md it starts the description's row (40px wide), or sits before
 * the h1 when there is no description, so it never takes a row of its own (P50). On a phone at
 * large text it is hidden: it does not scale with text and would crowd the words (P49).
 */
export const pageHeaderIcon = cva({
  base: {
    flex: "0 0 auto",
    width: { base: "10", md: "16" },
    alignSelf: "flex-start",
    [LARGE_TEXT_PHONE]: { display: "none" },
    [SHORT_VIEWPORT]: { display: "none" },
  },
  variants: {
    withText: {
      true: { order: { base: 4, md: 0 } },
      false: { order: 0, alignSelf: { base: "center", md: "flex-start" } },
    },
  },
  defaultVariants: { withText: true },
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
