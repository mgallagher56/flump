import { cva } from "../../../styled-system/css";

export const taxTrapRoot = cva({
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
    padding: { base: "5", sm: "8" },
    marginBottom: "10",
  },
});

export const taxTrapHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const taxTrapBadges = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});

export const taxTrapTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: "0" },
});

export const taxTrapIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: "0", maxWidth: "70ch" },
});

export const taxTrapControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: "0" },
});

export const taxTrapContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

/**
 * Outcome cards. The first card (the outcome) spans the full row; the supporting cards (at most
 * two) share the row below from `sm`, and stack on a phone.
 */
export const taxTrapOutcomes = cva({
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

export const taxTrapNote = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    margin: "0",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    "& p": { margin: "0" },
  },
});

export const taxTrapSectionTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: "0" },
});

export const taxTrapLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const taxTrapAssumptions = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    "& ul": { margin: "0", paddingLeft: "5", display: "flex", flexDirection: "column", gap: "1" },
  },
});

export const taxTrapCta = cva({
  base: { alignSelf: { base: "stretch", sm: "flex-start" }, gap: "2" },
});
