import { cva } from "../../../styled-system/css";

/** The tool's card: one bordered surface holding the header, the split and the sign-up button. */
export const mortgageIsaRoot = cva({
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

export const mortgageIsaHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const mortgageIsaTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const mortgageIsaIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

/** Left column: three visible inputs, then the "More options" drawer. */
export const mortgageIsaControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: "0" },
});

export const mortgageIsaDrawerBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", paddingTop: "2" },
});

/** Right column: the amount set aside, the two options side by side, the explainer, the notice. */
export const mortgageIsaContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards. The first card spans the full row; the two options share the row below from
 * `sm`, and stack on a phone.
 */
export const mortgageIsaOutcomes = cva({
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

export const mortgageIsaExplainer = cva({
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

export const mortgageIsaExplainerTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: "0" },
});

export const mortgageIsaCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
