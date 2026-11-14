import { cva } from "@repo/ui/styled-system/css";

export const runwayRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "6" },
});

/** The controls column: two inputs, then "More options". Sits on the zone surface (no card). */
export const controlsStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
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

/** The one outcome: label, figure, one plain sentence, two supporting figures. */
export const outcome = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const outcomeLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: 0 },
});

export const scenarioValue = cva({
  base: {
    textStyle: "numeric.kpi",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const introText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "60ch" },
});

export const breakdownList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    marginTop: "3",
    marginBottom: 0,
    paddingTop: "3",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const breakdownRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    "& dd": { margin: 0 },
  },
});
