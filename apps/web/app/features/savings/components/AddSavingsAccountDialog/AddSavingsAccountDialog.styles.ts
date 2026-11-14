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

export const formActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
});

/** "Delete account" sits at the start of the action row, apart from Cancel and Save. */
export const deleteAction = cva({
  base: { marginInlineEnd: "auto", display: "flex" },
});
