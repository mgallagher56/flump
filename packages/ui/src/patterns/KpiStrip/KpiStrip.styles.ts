import { cva } from "../../../styled-system/css";

/**
 * Direction A: a single row from `sm` upwards, a 2x2 grid at phone width (375px).
 * `columns` is capped at 4 by type. Passing more children than `columns` wraps onto a second
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
      2: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
      3: {
        gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
      },
      4: {
        gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
      },
    },
  },
  defaultVariants: {
    columns: 4,
  },
});
