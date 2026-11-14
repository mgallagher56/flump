import { cva } from "../../../styled-system/css";

/** The tool's card: one bordered surface holding the header, the split and the sign-up button. */
export const zeroRoot = cva({
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

export const zeroHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const zeroTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const zeroIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

/** Left column: at most three visible inputs (a calculator with more adds a "More options" drawer). */
export const zeroControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

/** Right column: outcome, supporting figures, the explainer, then the one notice. */
export const zeroContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards. The first card (the outcome) spans the full row; the supporting cards (at most
 * two) share the row below from `sm`, and stack on a phone.
 */
export const zeroOutcomes = cva({
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
export const zeroOutcomeText = cva({
  base: { textStyle: "numeric.lg", color: "text.primary" },
});

export const zeroExplainer = cva({
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

export const zeroCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
