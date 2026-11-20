import { cva } from "@repo/ui/styled-system/css";

/** Sits under the hero figure, left aligned, never stretched across the page. */
export const quickRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", alignSelf: "flex-start" },
});

/** The field, then Save and Cancel beside it from sm, below it on a phone. */
export const quickForm = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    alignItems: { base: "stretch", sm: "flex-end" },
    gap: "3",
  },
});

export const quickActions = cva({
  base: { display: "flex", gap: "2", alignItems: "center" },
});
