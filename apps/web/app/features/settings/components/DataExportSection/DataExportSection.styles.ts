import { cva } from "@repo/ui/styled-system/css";

/** The card is as wide as its button and message, not the whole column (P37). */
export const exportCard = cva({
  base: { width: "fit-content", maxWidth: "100%" },
});

export const exportRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    alignItems: { base: "flex-start", sm: "center" },
    gap: "3",
    flexWrap: "wrap",
  },
});
