import { cva } from "@repo/ui/styled-system/css";

/** Sits on the scenario zone surface inside "More options": no card chrome (E16 PR 6). */
export const inputsBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const inputsHint = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const inputsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

/** The term gets a row of its own, so "Years left to try" and "Months" each have room. */
export const termCell = cva({
  base: { gridColumn: "1 / -1", minWidth: 0 },
});

/** "Years" and "Months" side by side from `sm`, stacked on the narrowest phones. */
export const termPair = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

export const editedMark = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});
