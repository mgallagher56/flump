import { cva } from "@repo/ui/styled-system/css";

export const accountForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
  },
});

/**
 * The one sheet footer (RC-12, P28): on a phone the primary is full width above Cancel (the DOM
 * keeps Cancel first, so `column-reverse` puts the primary on top); from `sm` one row, right-aligned.
 */
export const formActions = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    justifyContent: "flex-end",
    gap: "3",
    "& > *": { width: { base: "100%", sm: "auto" } },
  },
});

/** "Delete account" sits at the start of the action row, apart from Cancel and Save. */
export const deleteAction = cva({
  base: { marginInlineEnd: { base: "0", sm: "auto" }, display: "flex" },
});
