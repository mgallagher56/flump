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

/** One debt: legend and remove button on a row, the three fields below. */
export const debtRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "2",
    rowGap: "2",
    minWidth: "0",
    margin: "0",
    padding: "3",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
  },
});

/** Floated so the legend takes part in the row's grid instead of sitting on the border. */
export const debtRowLegend = cva({
  base: {
    float: "left",
    gridColumn: "1",
    padding: "0",
    textStyle: "label.md",
    color: "text.primary",
  },
});

export const debtRowRemove = cva({
  base: { gridColumn: "2", justifySelf: "end" },
});

/**
 * The three fields wrap to as many columns as fit (one on a phone, three in a wide column), so a
 * row never forces sideways scrolling at 375px (known #10).
 */
export const debtRowFields = cva({
  base: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr))",
    gap: "3",
    minWidth: "0",
    alignItems: "end",
  },
});

export const debtAddButton = cva({
  base: { alignSelf: "flex-start", gap: "2" },
});

/** Right column: outcome, the two methods, the explainer, then the one notice. */
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

export const debtExplainerTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: "0" },
});

export const debtCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
