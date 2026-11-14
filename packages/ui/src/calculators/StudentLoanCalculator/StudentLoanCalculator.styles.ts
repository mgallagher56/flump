import { cva } from "../../../styled-system/css";

/** The tool's card: one bordered surface holding the header, the split and the sign-up button. */
export const studentLoanRoot = cva({
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

export const studentLoanHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const studentLoanTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const studentLoanIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

/** Left column: the plan, then two sliders. */
export const studentLoanControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: "0" },
});

/** Right column: outcome, supporting figures, the explainer, then the one notice. */
export const studentLoanContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards: the worded answer, then the one supporting figure, each a full row so neither
 * card is left part-empty beside the other.
 */
export const studentLoanOutcomes = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "3",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * The headline answer is words, not a figure, so it takes a heading text style rather than the
 * KPI number style: normal word spacing and line height when it wraps.
 */
export const studentLoanOutcomeText = cva({
  base: { display: "block", textStyle: "heading.lg", color: "text.primary", margin: "0" },
});

export const studentLoanExplainer = cva({
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

export const studentLoanCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
