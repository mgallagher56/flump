import { cva } from "@repo/ui/styled-system/css";

export const page = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "16px", md: "24px" },
    width: "100%",
    maxWidth: "1200px",
    marginX: "auto",
    paddingX: { base: "16px", md: "24px" },
    paddingY: { base: "16px", md: "24px" },
    minWidth: 0,
  },
});

export const tableCard = cva({
  base: { minWidth: 0, fontVariantNumeric: "tabular-nums" },
});
