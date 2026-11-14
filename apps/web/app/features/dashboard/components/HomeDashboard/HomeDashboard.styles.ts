import { cva } from "@repo/ui/styled-system/css";

export const sectionsRegion = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    // Places the section cards so the first-view fold falls between cards or through a card's
    // padding, never between a card's label and its figure, for both seeded households at
    // 1280x800, 1440x900 and 390x844 (checked 2026-11-14; ruling on the first-view count).
    marginTop: "3.5",
  },
});

export const sectionHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const widgetGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    alignItems: "stretch",
    gap: { base: "12px", md: "20px" },
    minWidth: 0,
  },
  variants: {
    // An odd last card spans both columns from md, so the grid never leaves a hole (R2-4).
    odd: {
      true: { "& > :last-child": { gridColumn: { md: "1 / -1" } } },
      false: {},
    },
  },
  defaultVariants: { odd: false },
});

/** A 44px square below md (icon only, `sizes.touch`); from md the button is unchanged. */
export const showHideButton = cva({
  base: {
    gap: "8px",
    mdDown: {
      width: "touch",
      height: "touch",
      minWidth: "touch",
      minHeight: "touch",
      paddingX: "0",
      flexShrink: 0,
    },
  },
});

/**
 * Below md the h1 and the icon button share one row: PageHeader's text column has a 280px flex
 * basis, which with the button does not fit at 375 and pushed the button onto its own row. From md
 * PageHeader's own layout applies unchanged.
 */
export const dashboardHeader = cva({
  base: {
    // The page's section gap (spacing.page.section) is the only space before the hero; PageHeader's
    // own bottom margin doubled it to about 56px at 1280. `:is(header)` outranks that margin.
    "&:is(header)": { marginBottom: "0" },
    mdDown: {
      flexWrap: "nowrap",
      alignItems: "center",
      "& > :first-child": { flexBasis: "0", flexGrow: 1 },
    },
  },
});

/** The button's words, hidden below md where the icon stands alone. */
export const showHideText = cva({
  base: { display: { base: "none", md: "inline" } },
});

/** Setup and check-in rows sit close together so they read as one group (law of proximity). */
export const housekeepingGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    _empty: { display: "none" },
  },
});

/** The "Unverified estimate" sentence on its own line inside the one notice. */
export const noticeLeadLine = cva({
  base: { display: "block", marginBottom: "1" },
});
