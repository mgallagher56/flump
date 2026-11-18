import { cva } from "@repo/ui/styled-system/css";

/** The controls column: two inputs, then "Accounts and spending to include". Sits on the zone surface (no card). */
export const controlsStack = cva({
  // Amounts are short, so the inputs stop at 320px instead of filling the column (round 4).
  base: { display: "flex", flexDirection: "column", gap: "4", "& > *": { maxWidth: "320px" } },
});

export const optionsStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", paddingTop: "2" },
});

/** Switches fill the zone width: 1 column on a phone, 4 on a wide screen, near their labels. */
export const optionItems = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      md: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(4, minmax(0, 1fr))",
    },
    columnGap: "8",
    rowGap: "2",
  },
});

export const optionGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    border: "none",
    margin: 0,
    padding: 0,
    minWidth: 0,
  },
});

export const optionLegend = cva({
  base: { textStyle: "label.md", color: "text.secondary", padding: 0, marginBottom: "1" },
});

export const optionHint = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

/** The illustrated figure inside the zone's result card. */
export const resultFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
