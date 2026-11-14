import { cva } from "../../../styled-system/css";

/**
 * Direction A: a single row from `sm` upwards. At phone width (375px) 2 cards sit side by side, 3 stack in one
 * column and 4 sit 2x2, so a card is never orphaned on a row of its own (2 + 1).
 * `columns` defaults to 3 (E16 P1.5) and is capped at 4 by type. Passing more children than `columns` wraps onto a second
 * row rather than throwing, but top-level KPI strips should stay at four or fewer.
 */
export const kpiStripGrid = cva({
  base: {
    display: "grid",
    gap: "density.gap",
    width: "100%",
    // Every card is as tall as the row, so a card without a caption leaves no ragged bottom.
    alignItems: "stretch",
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: "minmax(0, 1fr)" },
      // Two-up: from `lg` the cards keep the width of a 3-card strip and leave the last third
      // empty, so 2 figures never stretch across a wide page (E16 round 3).
      // Two cards sit side by side from the phone up, so they do not push the next section
      // below the fold (round 4); KPI values step down in narrow cards (R2-2).
      2: {
        gridTemplateColumns: {
          base: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
        },
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
