import { cva } from "../../../styled-system/css";

/**
 * Viewport narrower than 20em: a phone with large text (375px at 200% text is about 11.7em, 320px
 * at default text is exactly 20em, so it does not match). Panda's `md` is em-based too, so on a
 * phone at large text the base (phone) layout always applies.
 */
const LARGE_TEXT_PHONE = "@media screen and (max-width: 19.99em)";

/**
 * A viewport under 480px tall: a phone in landscape (812x375). The 67px app header and a full page
 * header there push the headline figure below the first view, so the header goes compact: no page
 * icon or description, a smaller h1 and less space below (P78). Also used by PageBody.
 */
export const SHORT_VIEWPORT = "@media screen and (max-height: 479.98px)";

/**
 * Below md: a wrapping flex row. The h1 takes the first line and the actions sit beside it when
 * the h1 fits on one line beside them; otherwise the actions drop under the h1, so the h1 is never
 * squeezed and nothing overlaps it (phone audit RC-1). The description runs full width under both.
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
    [SHORT_VIEWPORT]: { display: "none" },
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
    order: 2,
    flex: "0 1 auto",
    maxWidth: "100%",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: { base: "flex-start", md: "flex-end" },
    gap: "3",
  },
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
