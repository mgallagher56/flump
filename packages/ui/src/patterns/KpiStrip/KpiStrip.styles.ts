import { cva } from "../../../styled-system/css";

/**
 * Direction A: a single row from `sm` upwards. At phone width (375px) 2 or 3 cards stack in one
 * column and 4 sit 2x2, so a card is never orphaned on a row of its own (2 + 1).
 * `columns` defaults to 3 (E16 P1.5) and is capped at 4 by type. Passing more children than `columns` wraps onto a second
 * row rather than throwing, but top-level KPI strips should stay at four or fewer.
 */
export const kpiStripGrid = cva({
  base: {
    display: "grid",
    gap: "density.gap",
    width: "100%",
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: "minmax(0, 1fr)" },
      2: {
        gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
      },
      3: {
        gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
      },
      4: {
        gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
      },
    },
  },
  defaultVariants: {
    columns: 3,
  },
});
