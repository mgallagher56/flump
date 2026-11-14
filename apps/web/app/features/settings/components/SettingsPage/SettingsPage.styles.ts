import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    maxWidth: "4xl",
    marginX: "auto",
    paddingBottom: "12",
    minWidth: 0,
  },
});
