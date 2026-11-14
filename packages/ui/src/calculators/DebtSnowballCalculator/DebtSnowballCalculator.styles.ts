import { cva } from "../../../styled-system/css";

/** The tool's card: one bordered surface holding the header, the split and the sign-up button. */
export const debtRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "5",
    width: "100%",
    minWidth: "0",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "2xl",
    padding: { base: "4", sm: "8" },
  },
});

export const debtHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const debtTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const debtIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

/** Left column: the list of debts (the core input), then the one slider. */
export const debtControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: "0" },
});

export const debtList = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: "0" },
});

/**
 * One debt, with no border of its own (no card in a card): rows are split by a quiet rule.
 * At every width the name and the actions share the top line and the fields sit below at full
 * width, so the name never wraps beside the balance.
 */
export const debtRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "3",
    rowGap: "2",
    minWidth: "0",
    margin: "0",
    padding: "0",
    paddingBlock: "3",
    border: "none",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    "&:first-of-type": { borderTopWidth: "0", paddingTop: "0" },
  },
});

/** Floated so the legend takes part in the row's grid instead of sitting on the border. */
export const debtRowLegend = cva({
  base: {
    float: "left",
    gridColumn: "1",
    gridRow: "1",
    alignSelf: "center",
    padding: "0",
    textStyle: "label.md",
    color: "text.primary",
  },
});

export const debtRowActions = cva({
  base: { display: "flex", gap: "1", justifySelf: "end", gridColumn: "2", gridRow: "1" },
});

/**
 * The fields wrap to as many columns as fit, so a row never forces sideways scrolling at 375px
 * (known #10). Open, the minimum sits beside the balance and the rate goes below.
 */
export const debtRowFields = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
    gap: "3",
    minWidth: "0",
    alignItems: "end",
    gridColumn: "1 / -1",
    gridRow: "2",
  },
});

export const debtAddButton = cva({
  base: { alignSelf: "flex-start", gap: "2" },
});

/** Right column: the outcome, the two methods, the sign-up button and the details. */
export const debtContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards. The first card (the outcome) spans the full row; the supporting cards (at most
 * two) share the row below from `sm`, and stack on a phone.
 */
export const debtOutcomes = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "3",
    fontVariantNumeric: "tabular-nums",
    "& > :first-child": { gridColumn: "1 / -1" },
    // A lone supporting figure takes the whole row instead of leaving a half-width gap.
    "& > :nth-child(2):last-child": { gridColumn: "1 / -1" },
  },
});

/** A worded outcome (no balance) at the same size as a figure, so the card keeps its rhythm. */
export const debtOutcomeText = cva({
  base: { textStyle: "numeric.lg", color: "text.primary" },
});

export const debtExplainer = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    margin: "0",
    textStyle: "body.sm",
    color: "text.secondary",
    "& p": { margin: "0" },
  },
});

export const debtDetails = cva({
  base: { fontVariantNumeric: "tabular-nums", overflowX: "auto" },
});

export const debtCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
