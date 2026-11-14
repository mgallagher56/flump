import { cva } from "../../../styled-system/css";

export const explorerRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%", minWidth: "0" },
});

/** The standalone tool's card: one bordered surface, as in the other calculators. */
export const explorerCard = cva({
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

export const explorerControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: "0" },
});

export const explorerDetails = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const explorerFieldset = cva({
  base: {
    border: "none",
    margin: "0",
    padding: "0",
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
});

export const explorerLegend = cva({
  base: { textStyle: "label.md", color: "text.primary", marginBottom: "1", padding: "0" },
});

export const explorerContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

export const explorerAction = cva({
  base: { alignSelf: "flex-start" },
});

export const explorerCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});

/**
 * Scenario outcome cards. The first card (the outcome) spans the full row; the supporting cards
 * (at most two) share the row below from `sm`, and stack on a phone.
 */
export const explorerOutcomes = cva({
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

/** The "As at tax year" badge at the top of the results, as in the tax trap tool. */
export const explorerBadges = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});
