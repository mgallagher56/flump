import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingBottom: "48px",
    minWidth: 0,
  },
});
