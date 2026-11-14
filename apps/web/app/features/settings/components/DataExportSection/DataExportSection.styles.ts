import { cva } from "@repo/ui/styled-system/css";

export const exportRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    alignItems: { base: "flex-start", sm: "center" },
    gap: "3",
    flexWrap: "wrap",
  },
});
