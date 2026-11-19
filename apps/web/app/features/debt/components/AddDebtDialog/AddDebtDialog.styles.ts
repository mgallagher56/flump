import { css, cva } from "@repo/ui/styled-system/css";

export const debtForm = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * Two fields side by side from `md`, one column below. From `md` each field becomes a subgrid of
 * three rows (label, control, error), so labels sit on one baseline (a wrapped label pushes both
 * controls down together), the controls share a top edge and the columns are the same width.
 */
export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    gap: "4",
    "& > *": {
      md: {
        display: "grid",
        gridRow: "span 3",
        gridTemplateRows: "subgrid",
        rowGap: "1.5",
      },
    },
    "& [data-field-label-row]": {
      md: { alignSelf: "end" },
    },
  },
});

/**
 * Edit mode's "Delete debt" (`Button variant="dangerSubtle"`, owner item 25), set apart from Save.
 * The dialog footer stacks its buttons below `sm` (this one last) and puts it on the left from
 * `sm`. The page still asks for confirmation before anything is deleted.
 */
export const deleteAction = css({ sm: { marginInlineEnd: "auto" } });

/** Footer buttons keep their label on one line; the footer stacks them below `sm` instead. */
export const footerButton = css({ whiteSpace: "nowrap", flexShrink: 0 });
