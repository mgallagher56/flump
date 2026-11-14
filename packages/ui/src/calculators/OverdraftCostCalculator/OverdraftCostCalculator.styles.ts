import { cva } from "../../../styled-system/css";

/** The tool's card: one bordered surface holding the header, the split and the sign-up button. */
export const overdraftRoot = cva({
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

export const overdraftHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const overdraftTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const overdraftIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

/** Left column: at most three visible inputs (a calculator with more adds a "More options" drawer). */
export const overdraftControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

/** Right column: outcome, supporting figures, the explainer, then the one notice. */
export const overdraftContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards. The first card (the outcome) spans the full row; the supporting cards (at most
 * two) share the row below from `sm`, and stack on a phone.
 */
export const overdraftOutcomes = cva({
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

export const overdraftExplainer = cva({
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

export const overdraftExplainerTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: "0" },
});

export const overdraftCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
