import { cva } from "../../../styled-system/css";

/**
 * Direction A: a single row from `sm` upwards. At phone width 2 cards sit side by side, 3 sit as
 * two columns with the third full width under them, and 4 sit 2x2, so three cards never stack
 * into a screen-tall column (phone audit P20).
 * `columns` defaults to 3 (E16 P1.5) and is capped at 4 by type. Passing more children than `columns` wraps onto a second
 * row rather than throwing, but top-level KPI strips should stay at four or fewer.
 *
 * Each `KpiCard` takes three of the strip's rows as a subgrid (label, value, foot), so when one
 * card's label wraps onto two lines the figures beside it still share one line (P21).
 */
export const kpiStripGrid = cva({
  base: {
    display: "grid",
    gap: "density.gap",
    width: "100%",
    // Every card is as tall as the row, so a card without a caption leaves no ragged bottom.
    alignItems: "stretch",
    "& > [data-kpi-card]": {
      display: "grid",
      gridRow: "span 3",
      gridTemplateRows: "subgrid",
      alignContent: "start",
    },
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: "minmax(0, 1fr)" },
      // Two-up: from `lg` the cards keep the width of a 3-card strip and leave the last third
      // empty, so 2 figures never stretch across a wide page (E16 round 3).
      // Two cards: equal halves of the full content width at every size, so the strip's edges
      // line up with the hero (STYLE-GUIDE, KPI strip; round 4). Never capped to a narrower grid.
      2: {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
      3: {
        gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
        "& > :nth-child(3):last-child": { gridColumn: { base: "1 / -1", sm: "auto" } },
        // The full-width third card shows the same figure size as the two above it (P22). Those
        // step to md when their content box is 7rem or less; the third card is then two cards
        // plus the gap wide, 2 x 7rem + padding + gap = 17.5rem, so it steps at that width.
        "& > :nth-child(3):last-child [data-kpi-value]": {
          "@media screen and (max-width: 39.99em)": {
            "@container (max-width: 17.5rem)": { fontSize: "md" },
          },
        },
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
