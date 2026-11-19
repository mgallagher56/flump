import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    // The PageBody section gap, so every block on the page sits the same distance apart (P35).
    gap: "page.section",
    minWidth: 0,
  },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
});

export const accountLink = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    // A list of account names reads as a list of links without an underline on every row; the
    // underline comes back on hover and focus.
    textDecoration: "none",
    textUnderlineOffset: "3px",
    borderRadius: "sm",
    overflowWrap: "anywhere",
    "&::after": {
      content: '""',
      position: "absolute",
      inset: "0",
      zIndex: "0",
    },
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

/** A total line under a table. A real top border, so it survives forced colours. */
export const totalRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "16px",
    margin: 0,
    paddingBlock: "16px",
    paddingInline: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    fontVariantNumeric: "tabular-nums",
    "& dd": { margin: 0 },
  },
  variants: {
    emphasis: { true: { borderTopWidth: 0 } },
  },
});

export const totalLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
  variants: {
    emphasis: { true: { textStyle: "heading.sm" } },
  },
});

export const note = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "65ch" },
});

/** What you own and what you owe side by side from lg, so a name sits near its figure. */
export const groupsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
    alignItems: "start",
    gap: { base: "24px", md: "32px" },
    minWidth: 0,
  },
});

/** The DataList inside a card: rows padded to the card edge, figures centred on the row. */
export const listInCard = cva({
  base: {
    // One row height whether or not a type line shows under the name.
    "& > ul > li": {
      position: "relative",
      paddingInline: "16px",
      alignItems: "center",
      minHeight: "72px",
      cursor: "pointer",
      _hover: { backgroundColor: "surface.subtle" },
      _focusWithin: {
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "border.focusRing",
        outlineOffset: "-2px",
      },
    },
    "& > div": { paddingInline: "16px", paddingBlockEnd: "12px" },
  },
});

/** Name, then the type underneath when the name does not already say it. */
export const accountName = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const accountType = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});

/** "Change what counts" and "See how it has changed", side by side when they fit. */
export const netWorthLinks = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "flex-start",
    columnGap: "16px",
    rowGap: "8px",
  },
});

/** The ISA row's link to its allowance, under the account name at every width. */
export const isaLink = cva({
  base: {
    position: "relative",
    zIndex: "1",
    textStyle: "body.sm",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    width: "fit-content",
    borderRadius: "sm",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** Net worth and the one line under it about what counts. */
/**
 * The hero and what follows it. The space below the hero is the page's one section gap, the same
 * as on Home where the next block is a PageBody section (P35).
 */
export const netWorthBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "page.section", minWidth: 0 },
});

/** The basis line, the history link and the phone check-in button, close together. */
export const netWorthAfter = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

/** "See how it has changed": the basis line's size, so both links read as one style (P34). */
export const historyLink = cva({
  base: { textStyle: "body.sm" },
});
