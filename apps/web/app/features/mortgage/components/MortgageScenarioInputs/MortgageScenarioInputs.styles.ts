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
    gridTemplateColumns: { base: "1fr", md: "repeat(3, minmax(0, 1fr))" },
    gap: "16px",
  },
});

/** "Years" and "Months" side by side in the term's one grid cell. */
export const termPair = cva({
  base: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "4" },
});

export const editedMark = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});
